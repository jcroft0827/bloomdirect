import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWeddingInquiry from "@/models/BloomWeddingInquiry";
import Shop from "@/models/Shop";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { getResend } from "@/lib/resend";

export const runtime = "nodejs";
const fields = {name:120,email:254,phone:40,eventDate:10,venue:180,budget:80,eventType:100,message:3000} as const;
function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max + 1) : ""; }
function validDate(s:string) { if (!s) return true; if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d=new Date(`${s}T12:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===s; }
function escapeHtml(s:string) {return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));}
export async function POST(request: Request, context: {params: Promise<{previewSlug:string}>}) {
 try {
  const {previewSlug}=await context.params;
  if (Number(request.headers.get("content-length") || 0)>12000) return NextResponse.json({error:"Request too large."},{status:413});
  await connectToDB();
  const website=await BloomWebsite.findOne({previewSlug}).select("_id shop status customDomain domainVerified weddingsPage").lean<{_id: unknown;shop:unknown;status?:"preview"|"live"|"paused";customDomain?:string;domainVerified?:boolean;weddingsPage?:{enabled?:boolean}}>();
  if (!website || !website.weddingsPage?.enabled) return NextResponse.json({error:"Page not found."},{status:404});
  const access=await authorizeBloomWebsiteStorefrontAccess(request,website);
  if (!access.allowed) return access.response;
  if (access.mode!=="public_live") return NextResponse.json({error:"Inquiries are available on the live florist website only."},{status:403});
  const limit=await checkBloomWebsiteRateLimit({request,scope:"wedding-inquiry",subject:String(website._id),limit:3,windowMs:15*60*1000});
  if (!limit.allowed) return NextResponse.json({error:"Too many submissions. Please try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
  let body: Record<string,unknown>;
  try {body=await request.json() as Record<string,unknown>;} catch {return NextResponse.json({error:"Invalid form submission."},{status:400});}
  if (!body || typeof body!=="object" || Array.isArray(body)) return NextResponse.json({error:"Invalid form submission."},{status:400});
  // Honeypot: bot submissions are ignored without creating records or sending mail.
  if (body.companyWebsite) return NextResponse.json({ok:true});
  const data=Object.fromEntries(Object.entries(fields).map(([key,max])=>[key,clean(body[key],max)])) as Record<keyof typeof fields,string>;
  if (Object.entries(fields).some(([key,max])=>data[key as keyof typeof fields].length>max) || !data.name || !data.message || data.message.length<12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !validDate(data.eventDate)) return NextResponse.json({error:"Please check your name, email, event date and message."},{status:400});
  const shop=await Shop.findById(website.shop).select("email businessName isSuspended").lean<{email?:string;businessName?:string;isSuspended?:boolean}>();
  if (!shop || shop.isSuspended) return NextResponse.json({error:"Page not found."},{status:404});
  const inquiry=await BloomWeddingInquiry.create({...data,shop:website.shop,website:website._id});
  // Do not fail or duplicate a saved inquiry when mail delivery fails.
  if (shop.email && process.env.RESEND_API_KEY) {
   try {
    const result=await getResend().emails.send({from:process.env.RESEND_FROM_EMAIL || "BloomWebsites <notifications@getbloomdirect.com>",to:shop.email,subject:"New Weddings & Events inquiry",html:`<p>A new event inquiry has arrived for ${escapeHtml(shop.businessName || "your website")}.</p><p><strong>From:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p><p><strong>Event:</strong> ${escapeHtml(data.eventType || "Not specified")}</p><p><strong>Date:</strong> ${escapeHtml(data.eventDate || "Not specified")}</p><p>Open your BloomWebsites dashboard to review and respond. Do not reply to this automated email.</p>`});
    if (!result.error) await BloomWeddingInquiry.updateOne({_id:inquiry._id},{$set:{notificationSentAt:new Date()}});
    else console.error("Wedding inquiry notification failed",result.error);
   } catch(err) {console.error("Wedding inquiry notification error",err);}
  }
  return NextResponse.json({ok:true},{status:201});
 } catch(err) {console.error("Wedding inquiry submission failed",err);return NextResponse.json({error:"We could not submit your inquiry right now."},{status:500});}
}
