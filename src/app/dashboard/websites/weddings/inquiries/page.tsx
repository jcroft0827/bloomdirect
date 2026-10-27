import {getServerSession} from "next-auth";
import {redirect} from "next/navigation";
import Link from "next/link";
import authOptions from "@/lib/auth";
import {connectToDB} from "@/lib/mongoose";
import BloomWeddingInquiry from "@/models/BloomWeddingInquiry";
import BloomWeddingInquiryInbox from "@/components/websites/BloomWeddingInquiryInbox";
export default async function Page(){const session=await getServerSession(authOptions);if(!session?.user?.id)redirect("/login");await connectToDB();const records=await BloomWeddingInquiry.find({shop:session.user.id}).sort({createdAt:-1}).limit(150).lean();const items=records.map(r=>({id:String(r._id),name:String(r.name),email:String(r.email),phone:String(r.phone||""),eventDate:String(r.eventDate||""),venue:String(r.venue||""),budget:String(r.budget||""),eventType:String(r.eventType||""),message:String(r.message),status:String(r.status),internalNotes:String(r.internalNotes||""),createdAt:new Date(r.createdAt).toISOString()}));return <main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8"><Link href="/dashboard/websites/weddings" className="text-sm underline">← Weddings & Events</Link><h1 className="text-3xl font-bold">Wedding & event inquiries</h1><p className="text-slate-600">View the latest 150 inquiries. Notes and statuses are private to your shop.</p><BloomWeddingInquiryInbox initial={items}/></main>}
