"use client";

import { formatCurrencyFromCents } from "@/lib/format-currency";
import { useEffect, useState } from "react";

export default function OrderMessages({ orderId, loggedInShopId, order }: { orderId: string; loggedInShopId: string; order: any }) {

    const [messages, setMessages] = useState([]);

    // Pull Message History for Order
    useEffect(() => {
        async function fetchMessages() {
            try {
                const response = await fetch(`/api/orders/${orderId}/messages`);
                const data = await response.json();
                console.log("Fetched messages:", data);
                setMessages(data.messages);
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
    }

        fetchMessages();
    }, [orderId]);

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Order Messages</h1>
            <div className="p-4 bg-white rounded-lg shadow space-y-2">
                <h2 className="text-xl font-semibold">Order Details</h2>
                <div className="flex flex-col xl:flex-row xl:gap-4">
                    <p><strong>Order ID:</strong> {order.orderNumber}</p>
                    <p><strong>Originating Shop:</strong> {order.originatingShopName}</p>
                    <p><strong>Fulfilling Shop:</strong> {order.fulfillingShopName}</p>
                </div>
                <div className="flex flex-col xl:flex-row xl:gap-4">
                    <p><strong>Order Total: </strong> {formatCurrencyFromCents(order.pricing.orderTotalCents)}</p>
                    <p><strong>Delivery Charge:</strong> {formatCurrencyFromCents(order.pricing.deliveryFeeCents)}</p>
                    <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                    <p><strong>Order Status:</strong> {order.status}</p>
                </div>
                <div>
                    <h3><strong>Products:</strong></h3>
                    <div className="space-y-2 max-h-40 overflow-scroll flex flex-col md:flex-row md:gap-4 md:flex-wrap">
                        {order.products.map((product: any, index: number) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg flex gap-4 items-center">
                                <img src={product.photo} alt={product.name} style={{ width: "100px", height: "100px" }} />
                                <div>
                                    <p><strong>{product.name}</strong></p>
                                    <p>{product.description}</p>
                                    <p>Price: {formatCurrencyFromCents(product.priceCents)}</p>
                                    <p>Quantity: {product.qty}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold">Send New Message</h2>
                <form className="space-y-4">
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea id="message" name="message" rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Type your message here..."></textarea>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Send Message</button>
                </form>
            </div>

            <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold">Message History</h2>
                {messages.length === 0 ? (
                    <p>No messages yet.</p>
                ) : (
                    <div className="space-y-2">
                        {messages.map((message: any, index: number) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                <p>{message.text}</p>
                                <p className="text-sm text-gray-500">{new Date(message.createdAt).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}