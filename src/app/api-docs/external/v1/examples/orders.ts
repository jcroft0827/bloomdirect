// src/app/api-docs/external/v1/examples/orders.ts

export const getOrdersRequest = `curl -X GET "https://www.getbloomdirect.com/api/external/v1/orders?since=2026-08-05T12:00:00.000Z&limit=100" \\
  -H "x-api-key: YOUR_API_KEY"`;

export const getOrdersResponse = `{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "68935f106a9e3d72b872a101",
        "orderNumber": "1001",
        "status": "PENDING_ACCEPTANCE",
        "decline": {
          "reason": "",
          "message": ""
        },
        "recipient": {
          "fullName": "Jane Doe",
          "address": "123 Main St",
          "apt": "Apt 4B",
          "city": "Buffalo",
          "state": "NY",
          "zip": "14201",
          "phone": "555-123-4567",
          "email": "jane@example.com",
          "company": "Acme Corp",
          "message": "Happy Birthday!"
        },
        "customer": {
          "fullName": "John Smith",
          "email": "john@example.com",
          "phone": "555-987-6543"
        },
        "products": [
          {
            "name": "Red Roses",
            "description": "Dozen premium roses",
            "photo": "https://cdn.getbloomdirect.com/products/roses.jpg",
            "qty": 1,
            "taxable": true,
            "price": 59.99
          }
        ],
        "totals": {
          "currency": "USD",
          "productsSubtotal": 59.99,
          "deliveryFee": 10,
          "originatingFee": 0,
          "tax": 4.8,
          "orderTotal": 74.79,
          "fulfillmentAmount": 69.99
        },
        "delivery": {
          "date": "2026-08-08T00:00:00.000Z",
          "window": {
            "type": "specific",
            "from": "09:00",
            "to": "13:00"
          },
          "instructions": "Leave at front desk"
        },
        "paidAt": null,
        "timestamps": {
          "created": "2026-08-05T12:05:00.000Z",
          "accepted": null,
          "declined": null,
          "completed": null,
          "updated": "2026-08-05T12:05:00.000Z"
        }
      }
    ]
  },
  "meta": {
    "timestamp": "2026-08-06T13:30:00.000Z",
    "version": "1.0"
  }
}`;

export const acceptOrderRequest = `curl -X POST "https://www.getbloomdirect.com/api/external/v1/orders/68935f106a9e3d72b872a101/accept" \\
  -H "x-api-key: YOUR_API_KEY"`;

export const acceptOrderResponse = `{
  "success": true,
  "data": {
    "order": {
      "id": "68935f106a9e3d72b872a101",
      "orderNumber": "1001",
      "status": "ACCEPTED",
      "decline": {
        "reason": "",
        "message": ""
      },
      "recipient": {
        "fullName": "Jane Doe",
        "address": "123 Main St",
        "apt": "Apt 4B",
        "city": "Buffalo",
        "state": "NY",
        "zip": "14201",
        "phone": "555-123-4567",
        "email": "jane@example.com",
        "company": "Acme Corp",
        "message": "Happy Birthday!"
      },
      "customer": {
        "fullName": "John Smith",
        "email": "john@example.com",
        "phone": "555-987-6543"
      },
      "products": [
        {
          "name": "Red Roses",
          "description": "Dozen premium roses",
          "photo": "https://cdn.getbloomdirect.com/products/roses.jpg",
          "qty": 1,
          "taxable": true,
          "price": 59.99
        }
      ],
      "totals": {
        "currency": "USD",
        "productsSubtotal": 59.99,
        "deliveryFee": 10,
        "originatingFee": 0,
        "tax": 4.8,
        "orderTotal": 74.79,
        "fulfillmentAmount": 69.99
      },
      "delivery": {
        "date": "2026-08-08T00:00:00.000Z",
        "window": {
          "type": "specific",
          "from": "09:00",
          "to": "13:00"
        },
        "instructions": "Leave at front desk"
      },
      "paidAt": null,
      "timestamps": {
        "created": "2026-08-05T12:05:00.000Z",
        "accepted": "2026-08-05T14:12:00.000Z",
        "declined": null,
        "completed": null,
        "updated": "2026-08-05T14:12:00.000Z"
      }
    }
  },
  "meta": {
    "timestamp": "2026-08-05T14:12:00.000Z",
    "version": "1.0"
  }
}`;

export const declineOrderRequest = `curl -X POST "https://www.getbloomdirect.com/api/external/v1/orders/68935f106a9e3d72b872a101/decline" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "declineReason": "OTHER",
    "declineMessage": "We are closing early today"
  }'`;

export const declineOrderResponse = `{
  "success": true,
  "data": {
    "order": {
      "id": "68935f106a9e3d72b872a101",
      "orderNumber": "1001",
      "status": "DECLINED",
      "decline": {
        "reason": "OTHER",
        "message": "We are closing early today"
      },
      "recipient": {
        "fullName": "Jane Doe",
        "address": "123 Main St",
        "apt": "Apt 4B",
        "city": "Buffalo",
        "state": "NY",
        "zip": "14201",
        "phone": "555-123-4567",
        "email": "jane@example.com",
        "company": "Acme Corp",
        "message": "Happy Birthday!"
      },
      "customer": {
        "fullName": "John Smith",
        "email": "john@example.com",
        "phone": "555-987-6543"
      },
      "products": [
        {
          "name": "Red Roses",
          "description": "Dozen premium roses",
          "photo": "https://cdn.getbloomdirect.com/products/roses.jpg",
          "qty": 1,
          "taxable": true,
          "price": 59.99
        }
      ],
      "totals": {
        "currency": "USD",
        "productsSubtotal": 59.99,
        "deliveryFee": 10,
        "originatingFee": 0,
        "tax": 4.8,
        "orderTotal": 74.79,
        "fulfillmentAmount": 69.99
      },
      "delivery": {
        "date": "2026-08-08T00:00:00.000Z",
        "window": {
          "type": "specific",
          "from": "09:00",
          "to": "13:00"
        },
        "instructions": "Leave at front desk"
      },
      "paidAt": null,
      "timestamps": {
        "created": "2026-08-05T12:05:00.000Z",
        "accepted": null,
        "declined": "2026-08-05T14:15:00.000Z",
        "completed": null,
        "updated": "2026-08-05T14:15:00.000Z"
      }
    }
  },
  "meta": {
    "timestamp": "2026-08-05T14:15:00.000Z",
    "version": "1.0"
  }
}`;

export const completeOrderRequest = `curl -X POST "https://www.getbloomdirect.com/api/external/v1/orders/68935f106a9e3d72b872a101/complete" \\
  -H "x-api-key: YOUR_API_KEY"`;

export const completeOrderResponse = `{
  "success": true,
  "data": {
    "order": {
      "id": "68935f106a9e3d72b872a101",
      "orderNumber": "1001",
      "status": "COMPLETED",
      "decline": {
        "reason": "",
        "message": ""
      },
      "recipient": {
        "fullName": "Jane Doe",
        "address": "123 Main St",
        "apt": "Apt 4B",
        "city": "Buffalo",
        "state": "NY",
        "zip": "14201",
        "phone": "555-123-4567",
        "email": "jane@example.com",
        "company": "Acme Corp",
        "message": "Happy Birthday!"
      },
      "customer": {
        "fullName": "John Smith",
        "email": "john@example.com",
        "phone": "555-987-6543"
      },
      "products": [
        {
          "name": "Red Roses",
          "description": "Dozen premium roses",
          "photo": "https://cdn.getbloomdirect.com/products/roses.jpg",
          "qty": 1,
          "taxable": true,
          "price": 59.99
        }
      ],
      "totals": {
        "currency": "USD",
        "productsSubtotal": 59.99,
        "deliveryFee": 10,
        "originatingFee": 0,
        "tax": 4.8,
        "orderTotal": 74.79,
        "fulfillmentAmount": 69.99
      },
      "delivery": {
        "date": "2026-08-08T00:00:00.000Z",
        "window": {
          "type": "specific",
          "from": "09:00",
          "to": "13:00"
        },
        "instructions": "Leave at front desk"
      },
      "paidAt": null,
      "timestamps": {
        "created": "2026-08-05T12:05:00.000Z",
        "accepted": "2026-08-05T14:12:00.000Z",
        "declined": null,
        "completed": "2026-08-08T15:00:00.000Z",
        "updated": "2026-08-08T15:00:00.000Z"
      }
    }
  },
  "meta": {
    "timestamp": "2026-08-08T15:00:00.000Z",
    "version": "1.0"
  }
}`;