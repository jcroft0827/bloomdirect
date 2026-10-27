import {getServerSession} from "next-auth";
import {NextResponse} from "next/server";
import authOptions from "@/lib/auth";
import {connectToDB} from "@/lib/mongoose";
import BloomWeddingInquiry from "@/models/BloomWeddingInquiry";
export async function PATCH(request:Request){
 const session=await getServerSession(authOptions);if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
 let body:Record<string,unknown>;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid input"},{status:400});}
 if(typeof body.id!=="string" || !/^[a-f\d]{24}$/i.test(body.id))return NextResponse.json({error:"Invalid inquiry"},{status:400});
 const statuses=["new","contacted","consultation","booked","closed"];
 if(typeof body.status!=="string" || !statuses.includes(body.status) || typeof body.internalNotes!=="string" || body.internalNotes.length>3000)return NextResponse.json({error:"Invalid update"},{status:400});
 await connectToDB();const result=await BloomWeddingInquiry.updateOne({_id:body.id,shop:session.user.id},{$set:{status:body.status,internalNotes:body.internalNotes}});
 if(!result.matchedCount)return NextResponse.json({error:"Inquiry not found"},{status:404});return NextResponse.json({ok:true});
}
