// /app/api-docs/external/v1/examples/orders
export const getOrdersRequest = `curl -X GET https://api.getbloomdirect.com/v1/orders \\
  -H "x-api-key: YOUR_API_KEY"`;

export const getOrdersResponse = `{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ord_123",
        "orderNumber": "1001",
        "status": "PENDING_ACCEPTANCE",
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
            "id": "prod_1",
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
          "tax": 4.8,
          "total": 74.79
        },
        "delivery": {
          "date": "2026-04-20T00:00:00.000Z",
          "window": {
            "type": "window",
            "from": "09:00",
            "to": "13:00"
          },
          "instructions": "Leave at front desk"
        },
        "timestamps": {
          "created": "2026-04-15T12:00:00.000Z",
          "accepted": null,
          "declined": null,
          "completed": null,
          "updated": "2026-04-15T12:00:00.000Z"
        }
      }
    ]
  },
  "meta": {
    "timestamp": "2026-04-16T12:00:00.000Z",
    "version": "1.0"
  }
}`;

export const acceptOrderRequest = `curl -X POST https://api.getbloomdirect.com/v1/orders/ord_123/accept \\
  -H "x-api-key: YOUR_API_KEY"`;

export const acceptOrderResponse = `{
  "success": true,
  "data": {
    "order": {
      "id": "ord_123",
      "orderNumber": "1001",
      "status": "ACCEPTED_AWAITING_PAYMENT",
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
          "id": "prod_1",
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
        "tax": 4.8,
        "total": 74.79
      },
      "delivery": {
        "date": "2026-04-20T00:00:00.000Z",
        "window": {
          "type": "window",
          "from": "09:00",
          "to": "13:00"
        },
        "instructions": "Leave at front desk"
      },
      "timestamps": {
        "created": "2026-04-15T12:00:00.000Z",
        "accepted": "2026-04-15T14:12:00.000Z",
        "declined": null,
        "completed": null,
        "updated": "2026-04-15T14:12:00.000Z"
      }
    }
  },
  "meta": {
    "timestamp": "2026-04-16T12:00:00.000Z",
    "version": "1.0"
  }
}`;

export const declineOrderRequest = `curl -X POST https://api.getbloomdirect.com/v1/orders/ord_123/decline \\
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
      "id": "ord_123",
      "orderNumber": "1001",
      "status": "DECLINED",
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
          "id": "prod_1",
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
        "tax": 4.8,
        "total": 74.79
      },
      "delivery": {
        "date": "2026-04-20T00:00:00.000Z",
        "window": {
          "type": "window",
          "from": "09:00",
          "to": "13:00"
        },
        "instructions": "Leave at front desk"
      },
      "timestamps": {
        "created": "2026-04-15T12:00:00.000Z",
        "accepted": null,
        "declined": "2026-04-15T14:15:00.000Z",
        "completed": null,
        "updated": "2026-04-15T14:15:00.000Z"
      }
    }
  },
  "meta": {
    "timestamp": "2026-04-16T12:00:00.000Z",
    "version": "1.0"
  }
}`;

export const completeOrderRequest = `curl -X POST https://api.getbloomdirect.com/v1/orders/ord_123/complete \\
  -H "x-api-key: YOUR_API_KEY"`;

export const completeOrderResponse = `{
  "success": true,
  "data": {
    "order": {
      "id": "ord_123",
      "orderNumber": "1001",
      "status": "COMPLETED",
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
          "id": "prod_1",
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
        "tax": 4.8,
        "total": 74.79
      },
      "delivery": {
        "date": "2026-04-20T00:00:00.000Z",
        "window": {
          "type": "window",
          "from": "09:00",
          "to": "13:00"
        },
        "instructions": "Leave at front desk"
      },
      "timestamps": {
        "created": "2026-04-15T12:00:00.000Z",
        "accepted": "2026-04-15T14:12:00.000Z",
        "declined": null,
        "completed": "2026-04-15T15:00:00.000Z",
        "updated": "2026-04-15T15:00:00.000Z"
      }
    }
  },
  "meta": {
    "timestamp": "2026-04-16T12:00:00.000Z",
    "version": "1.0"
  }
}`;