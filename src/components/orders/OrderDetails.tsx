type Props = {
  deliveryDate: string;
  recipient: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    message?: string;
  };
  specialInstructions?: string;
};

export default function OrderDetails({
  deliveryDate,
  recipient,
  specialInstructions,
}: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Delivery Date</h3>
        <p className="text-xl font-black text-purple-700">
          {new Date(deliveryDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900">Recipient</h3>
        <p className="font-semibold">
          {recipient.firstName} {recipient.lastName}
        </p>
        <p className="text-gray-700">
          {recipient.address}
          <br />
          {recipient.city}, {recipient.state} {recipient.zip}
        </p>
        {recipient.phone && (
          <p className="text-gray-600">📞 {recipient.phone}</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900">Card Message</h3>
        <p className="italic bg-gray-50 p-4 rounded-xl text-gray-700">
          “{recipient.message || "No message"}”
        </p>
      </div>

      {specialInstructions && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl">
          <h3 className="font-bold text-yellow-800">
            Special Instructions
          </h3>
          <p className="text-yellow-900">{specialInstructions}</p>
        </div>
      )}
    </section>
  );
}
