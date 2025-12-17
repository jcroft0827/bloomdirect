import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export default async function ManualPasswordReset() {
    await connectToDB();
    const email = "gracekayden779@gmail.com";
    const newPass = "Flowers123!";
    const shop = await Shop.findOne({ email });

    try {
        shop.password = newPass;
        await shop.save();
    } catch (error) {
        console.log("Error resetting password:", error);
    }

    return <div><p></p></div>;
}