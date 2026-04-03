(() => {
  window.PCR_SEED = {
  "settings": {
    "companyName": "Premium Car Rental UAE",
    "trn": "100035111200003",
    "phone": "+971 4 360 9991",
    "emails": [
      "contact@pcr.ae",
      "mo@pcr.ae",
      "accounts@pcr.ae"
    ],
    "currency": "AED",
    "vatRate": 0.05,
    "rentalVatRate": 0.05,
    "salikVatRate": 0.05,
    "darbVatRate": 0.05,
    "fineServiceRate": 0.1,
    "fineServiceVatRate": 0.05,
    "depositDefault": 1000,
    "theme": {
      "bg": "#0b1020",
      "panel": "#111a33",
      "panel2": "#18264a",
      "accent": "#e44891",
      "accent2": "#7c5cff",
      "text": "#f5f7ff",
      "muted": "#aab4d6"
    },
    "documentFooterText": "Premium Car Rental UAE | TRN 100035111200003 | +971 4 360 9991",
    "terms": [
      "The renter is responsible for all traffic fines, Salik, Darb, parking charges, and toll-related penalties incurred during the rental period.",
      "Rental charges are subject to 5% VAT and are billed according to the selected rate plan and rental duration.",
      "Salik and Darb are billed separately and may include VAT as per invoice lines.",
      "Traffic fines attract a 10% administrative service fee plus VAT on that service fee.",
      "The vehicle must be returned in the same condition, subject to a signed inspection check card."
    ]
  },
  "vehicles": [
    {
      "id": "veh-001",
      "vehicleNumber": "PCR-001",
      "plateNumber": "A 12345",
      "make": "Toyota",
      "model": "Camry SE",
      "year": 2024,
      "color": "Pearl White",
      "category": "Sedan",
      "transmission": "Automatic",
      "fuelType": "Petrol",
      "vin": "JTNKH4FB0R1234501",
      "status": "Rented",
      "availability": "Unavailable",
      "dailyRate": 180,
      "weeklyRate": 1100,
      "monthlyRate": 3800,
      "deposit": 1000,
      "depositWaiver": 0,
      "cdwService": "Included",
      "pickupService": "Available",
      "deliveryService": "Available",
      "insuranceExpiry": "2026-09-15",
      "registrationExpiry": "2026-08-20",
      "serviceDueDate": "2026-06-10",
      "odometer": 18420,
      "notes": "Allocated to corporate rental. Full service history up to date.",
      "maintenanceHistory": [
        {
          "date": "2026-02-10",
          "type": "Oil service",
          "cost": 390
        }
      ],
      "rentalHistory": [
        "con-1001"
      ]
    },
    {
      "id": "veh-002",
      "vehicleNumber": "PCR-002",
      "plateNumber": "B 45678",
      "make": "Nissan",
      "model": "X-Trail",
      "year": 2023,
      "color": "Graphite Grey",
      "category": "SUV",
      "transmission": "Automatic",
      "fuelType": "Petrol",
      "vin": "JN8BT3CA8PW567892",
      "status": "Available",
      "availability": "Available",
      "dailyRate": 220,
      "weeklyRate": 1380,
      "monthlyRate": 4650,
      "deposit": 1200,
      "depositWaiver": 0,
      "cdwService": "Optional",
      "pickupService": "Available",
      "deliveryService": "Available",
      "insuranceExpiry": "2026-11-01",
      "registrationExpiry": "2026-10-05",
      "serviceDueDate": "2026-05-22",
      "odometer": 22350,
      "notes": "Ready for delivery and airport pickups.",
      "maintenanceHistory": [
        {
          "date": "2025-12-14",
          "type": "Brake pads",
          "cost": 650
        }
      ],
      "rentalHistory": []
    },
    {
      "id": "veh-003",
      "vehicleNumber": "PCR-003",
      "plateNumber": "C 90011",
      "make": "Kia",
      "model": "Sportage",
      "year": 2025,
      "color": "Deep Blue",
      "category": "SUV",
      "transmission": "Automatic",
      "fuelType": "Petrol",
      "vin": "KNDPXC7A3S1000112",
      "status": "Maintenance",
      "availability": "Unavailable",
      "dailyRate": 210,
      "weeklyRate": 1300,
      "monthlyRate": 4400,
      "deposit": 1000,
      "depositWaiver": 0,
      "cdwService": "Included",
      "pickupService": "Available",
      "deliveryService": "Available",
      "insuranceExpiry": "2026-12-31",
      "registrationExpiry": "2026-12-30",
      "serviceDueDate": "2026-04-18",
      "odometer": 8710,
      "notes": "Scheduled for body inspection after minor scratch.",
      "maintenanceHistory": [
        {
          "date": "2026-03-28",
          "type": "Body inspection",
          "cost": 0
        }
      ],
      "rentalHistory": [
        "con-0998"
      ]
    }
  ],
  "customers": [
    {
      "id": "cus-001",
      "fullName": "Ahmed Al Mansoori",
      "passportNumber": "P1234567",
      "passportExpiry": "2027-02-10",
      "emiratesId": "784-1990-1234567-8",
      "emiratesIdExpiry": "2027-02-10",
      "licenseNumber": "D12345678",
      "licenseExpiry": "2027-05-21",
      "issuingCountry": "UAE",
      "nationality": "Emirati",
      "dob": "1990-08-12",
      "mobile": "+971501112233",
      "email": "ahmed@almansoori.ae",
      "address": "Dubai Marina, Dubai, UAE",
      "companyName": "Al Mansoori Trading LLC",
      "tradeLicenseNumber": "123456",
      "emergencyContact": "+971509998877",
      "notes": "Corporate account with monthly billing.",
      "documents": [
        {
          "type": "passport",
          "status": "verified"
        }
      ],
      "activeContractStatus": "Active",
      "outstandingBalance": 1425.5,
      "linkedContracts": [
        "con-1001"
      ]
    },
    {
      "id": "cus-002",
      "fullName": "Sarah Johnson",
      "passportNumber": "K9876543",
      "passportExpiry": "2028-04-18",
      "emiratesId": "784-1988-7654321-1",
      "emiratesIdExpiry": "2028-04-18",
      "licenseNumber": "AE33445566",
      "licenseExpiry": "2027-12-10",
      "issuingCountry": "UK",
      "nationality": "British",
      "dob": "1988-03-02",
      "mobile": "+971502224466",
      "email": "sarah.j@example.com",
      "address": "Jumeirah Beach Residence, Dubai, UAE",
      "companyName": "",
      "tradeLicenseNumber": "",
      "emergencyContact": "+971501234567",
      "notes": "Short-term rental customer.",
      "documents": [
        {
          "type": "passport",
          "status": "verified"
        }
      ],
      "activeContractStatus": "Active",
      "outstandingBalance": 620.0,
      "linkedContracts": [
        "con-1002"
      ]
    },
    {
      "id": "cus-003",
      "fullName": "Omar Hassan",
      "passportNumber": "M1112223",
      "passportExpiry": "2026-10-02",
      "emiratesId": "784-1985-3334445-6",
      "emiratesIdExpiry": "2026-10-02",
      "licenseNumber": "D99887766",
      "licenseExpiry": "2026-12-01",
      "issuingCountry": "UAE",
      "nationality": "Egyptian",
      "dob": "1985-07-19",
      "mobile": "+971507778899",
      "email": "omar.hassan@company.ae",
      "address": "Business Bay, Dubai, UAE",
      "companyName": "Hassan Logistics FZE",
      "tradeLicenseNumber": "789012",
      "emergencyContact": "+971505555333",
      "notes": "Fleet partner; monthly renewals likely.",
      "documents": [
        {
          "type": "license",
          "status": "verified"
        }
      ],
      "activeContractStatus": "Inactive",
      "outstandingBalance": 0,
      "linkedContracts": []
    }
  ],
  "contracts": [
    {
      "id": "con-1001",
      "contractNumber": "CTR-2026-0001",
      "contractDate": "2026-03-24",
      "startDate": "2026-03-24T10:00:00",
      "endDate": "2026-04-08T10:00:00",
      "customerId": "cus-001",
      "vehicleId": "veh-001",
      "customerName": "Ahmed Al Mansoori",
      "vehicleNumber": "PCR-001",
      "plateNumber": "A 12345",
      "rateType": "monthly",
      "dailyRate": 180,
      "weeklyRate": 1100,
      "monthlyRate": 3800,
      "rentalDays": 15,
      "baseRental": 3800,
      "vatRental": 190,
      "salikTotal": 84,
      "darbTotal": 0,
      "fineTotal": 685.1,
      "otherCharges": 150,
      "deposit": 1000,
      "depositWaiver": 0,
      "cdw": 0,
      "pickup": 0,
      "delivery": 0,
      "advancePayment": 1200,
      "discount": 0,
      "paidAmount": 1200,
      "dueAmount": 3715.1,
      "status": "Active",
      "notes": "Corporate rental. Salik and fines billed separately.",
      "closureSummary": "",
      "invoiceId": "inv-1001",
      "renewalHistory": [
        "ren-1001"
      ],
      "ledgerIds": [
        "led-1001",
        "led-1002"
      ],
      "documentStatus": "Issued"
    },
    {
      "id": "con-1002",
      "contractNumber": "CTR-2026-0002",
      "contractDate": "2026-03-30",
      "startDate": "2026-03-30T14:00:00",
      "endDate": "2026-04-05T14:00:00",
      "customerId": "cus-002",
      "vehicleId": "veh-002",
      "customerName": "Sarah Johnson",
      "vehicleNumber": "PCR-002",
      "plateNumber": "B 45678",
      "rateType": "daily",
      "dailyRate": 220,
      "weeklyRate": 1380,
      "monthlyRate": 4650,
      "rentalDays": 6,
      "baseRental": 1320,
      "vatRental": 66,
      "salikTotal": 26.25,
      "darbTotal": 8.4,
      "fineTotal": 0,
      "otherCharges": 60,
      "deposit": 1200,
      "depositWaiver": 0,
      "cdw": 0,
      "pickup": 60,
      "delivery": 60,
      "advancePayment": 500,
      "discount": 0,
      "paidAmount": 500,
      "dueAmount": 1040.65,
      "status": "Active",
      "notes": "Airport pickup with toll tracking enabled.",
      "closureSummary": "",
      "invoiceId": "inv-1002",
      "renewalHistory": [],
      "ledgerIds": [
        "led-1003"
      ],
      "documentStatus": "Issued"
    }
  ],
  "renewals": [
    {
      "id": "ren-1001",
      "contractId": "con-1001",
      "renewalType": "monthly",
      "fromDate": "2026-04-08",
      "toDate": "2026-05-08",
      "addedDays": 30,
      "amount": 3800,
      "vat": 190,
      "total": 3990,
      "createdAt": "2026-04-01T09:30:00",
      "notes": "Extension requested before due date."
    }
  ],
  "invoices": [
    {
      "id": "inv-1001",
      "invoiceNumber": "INV-2026-0001",
      "contractId": "con-1001",
      "customerId": "cus-001",
      "issueDate": "2026-04-01",
      "status": "Part Paid",
      "subtotal": 4014,
      "vat": 200.7,
      "total": 4214.7,
      "paid": 1200,
      "balance": 3014.7,
      "lineItems": [
        {
          "label": "Monthly rental for Toyota Camry SE",
          "amount": 3800,
          "vat": 190
        },
        {
          "label": "Salik charges",
          "amount": 80,
          "vat": 4
        },
        {
          "label": "Traffic fine service & VAT adjusted total",
          "amount": 334.7,
          "vat": 16.7
        }
      ]
    },
    {
      "id": "inv-1002",
      "invoiceNumber": "INV-2026-0002",
      "contractId": "con-1002",
      "customerId": "cus-002",
      "issueDate": "2026-04-02",
      "status": "Part Paid",
      "subtotal": 1419.25,
      "vat": 70.96,
      "total": 1490.21,
      "paid": 500,
      "balance": 990.21,
      "lineItems": [
        {
          "label": "Daily rental for Nissan X-Trail",
          "amount": 1320,
          "vat": 66
        },
        {
          "label": "Salik charges",
          "amount": 25,
          "vat": 1.25
        },
        {
          "label": "Darb tolls",
          "amount": 8,
          "vat": 0.4
        },
        {
          "label": "Pickup & delivery",
          "amount": 120,
          "vat": 3.31
        }
      ]
    }
  ],
  "receipts": [
    {
      "id": "rec-1001",
      "receiptNumber": "RCP-2026-0001",
      "invoiceId": "inv-1001",
      "contractId": "con-1001",
      "customerId": "cus-001",
      "receivedDate": "2026-04-01T12:10:00",
      "amount": 1200,
      "method": "Card",
      "balanceAfter": 3014.7,
      "notes": "Advance payment received."
    },
    {
      "id": "rec-1002",
      "receiptNumber": "RCP-2026-0002",
      "invoiceId": "inv-1002",
      "contractId": "con-1002",
      "customerId": "cus-002",
      "receivedDate": "2026-04-02T09:15:00",
      "amount": 500,
      "method": "Cash",
      "balanceAfter": 990.21,
      "notes": "Booking deposit paid."
    }
  ],
  "accounts": [
    {
      "id": "acc-001",
      "customerId": "cus-001",
      "openingBalance": 0,
      "debits": 4214.7,
      "credits": 1200,
      "closingBalance": 3014.7,
      "lastUpdated": "2026-04-01T12:10:00"
    },
    {
      "id": "acc-002",
      "customerId": "cus-002",
      "openingBalance": 0,
      "debits": 1490.21,
      "credits": 500,
      "closingBalance": 990.21,
      "lastUpdated": "2026-04-02T09:15:00"
    }
  ],
  "ledger": [
    {
      "id": "led-1001",
      "date": "2026-04-01",
      "time": "12:10",
      "customerId": "cus-001",
      "contractId": "con-1001",
      "refType": "Receipt",
      "reference": "RCP-2026-0001",
      "debit": 0,
      "credit": 1200,
      "balance": 3014.7,
      "narration": "Advance payment received."
    },
    {
      "id": "led-1002",
      "date": "2026-04-01",
      "time": "12:20",
      "customerId": "cus-001",
      "contractId": "con-1001",
      "refType": "Invoice",
      "reference": "INV-2026-0001",
      "debit": 4214.7,
      "credit": 0,
      "balance": 4214.7,
      "narration": "Rental invoice issued."
    },
    {
      "id": "led-1003",
      "date": "2026-04-02",
      "time": "09:15",
      "customerId": "cus-002",
      "contractId": "con-1002",
      "refType": "Receipt",
      "reference": "RCP-2026-0002",
      "debit": 0,
      "credit": 500,
      "balance": 990.21,
      "narration": "Booking deposit received."
    }
  ],
  "maintenance": [
    {
      "id": "mnt-001",
      "vehicleId": "veh-003",
      "serviceDate": "2026-03-28",
      "serviceType": "Body inspection",
      "garage": "PCR Workshop",
      "odometer": 8710,
      "cost": 0,
      "partsReplaced": "None",
      "nextServiceDue": "2026-04-18",
      "notes": "Minor scratch inspection pending paint estimate.",
      "receiptReference": "MNT-REC-001",
      "status": "Open"
    }
  ],
  "fines": [
    {
      "id": "fin-001",
      "fineNumber": "FINE-778812",
      "authority": "Dubai Police",
      "vehicleId": "veh-001",
      "contractId": "con-1001",
      "customerId": "cus-001",
      "date": "2026-03-31",
      "time": "18:20",
      "violation": "Speeding",
      "amount": 620,
      "serviceFee": 62,
      "serviceFeeVat": 3.1,
      "total": 685.1,
      "status": "Unpaid",
      "assignmentStatus": "Matched",
      "notes": "Imported and matched to active contract."
    }
  ],
  "tolls": [
    {
      "id": "toll-001",
      "tollSystem": "Salik",
      "vehicleId": "veh-001",
      "contractId": "con-1001",
      "customerId": "cus-001",
      "date": "2026-03-26",
      "time": "09:12",
      "amount": 24,
      "vat": 1.2,
      "total": 25.2,
      "status": "Unpaid",
      "assignmentStatus": "Matched",
      "notes": "Al Safa North and Al Barsha crossings."
    },
    {
      "id": "toll-002",
      "tollSystem": "Darb",
      "vehicleId": "veh-002",
      "contractId": "con-1002",
      "customerId": "cus-002",
      "date": "2026-04-01",
      "time": "07:45",
      "amount": 8,
      "vat": 0.4,
      "total": 8.4,
      "status": "Unpaid",
      "assignmentStatus": "Matched",
      "notes": "Abu Dhabi peak period crossing."
    }
  ],
  "charges": [
    {
      "id": "chg-001",
      "contractId": "con-1002",
      "customerId": "cus-002",
      "vehicleId": "veh-002",
      "date": "2026-04-01",
      "type": "Pickup",
      "amount": 60,
      "vat": 3,
      "total": 63,
      "notes": "Airport pickup."
    },
    {
      "id": "chg-002",
      "contractId": "con-1002",
      "customerId": "cus-002",
      "vehicleId": "veh-002",
      "date": "2026-04-01",
      "type": "Delivery",
      "amount": 60,
      "vat": 3,
      "total": 63,
      "notes": "Hotel delivery."
    }
  ]
};
  window.PCR_CONFIG = {
  "appName": "Premium Car Rental UAE",
  "nav": [
    {
      "page": "index.html",
      "label": "Dashboard"
    },
    {
      "page": "vehicles.html",
      "label": "Vehicles"
    },
    {
      "page": "customers.html",
      "label": "Customers"
    },
    {
      "page": "contracts.html",
      "label": "Contracts"
    },
    {
      "page": "renewals.html",
      "label": "Renewals"
    },
    {
      "page": "invoices.html",
      "label": "Invoices"
    },
    {
      "page": "receipts.html",
      "label": "Receipts"
    },
    {
      "page": "accounts.html",
      "label": "Accounts"
    },
    {
      "page": "ledger.html",
      "label": "Ledger"
    },
    {
      "page": "maintenance.html",
      "label": "Maintenance"
    },
    {
      "page": "fines.html",
      "label": "Traffic Fines"
    },
    {
      "page": "tolls.html",
      "label": "Salik & Darb"
    },
    {
      "page": "charges.html",
      "label": "Other Charges"
    },
    {
      "page": "reports.html",
      "label": "Reports"
    },
    {
      "page": "documents.html",
      "label": "Documents"
    },
    {
      "page": "json.html",
      "label": "JSON Import/Export"
    },
    {
      "page": "settings.html",
      "label": "Settings"
    }
  ],
  "modules": {
    "vehicles": {
      "title": "Vehicles",
      "icon": "🚗",
      "storageKey": "vehicles",
      "searchFields": [
        "vehicleNumber",
        "plateNumber",
        "vin",
        "make",
        "model"
      ],
      "sortBy": "vehicleNumber",
      "columns": [
        {
          "label": "Vehicle #",
          "key": "vehicleNumber"
        },
        {
          "label": "Plate",
          "key": "plateNumber"
        },
        {
          "label": "Make / Model",
          "key": "makeModel"
        },
        {
          "label": "Year",
          "key": "year"
        },
        {
          "label": "Status",
          "key": "status",
          "badge": true
        },
        {
          "label": "Availability",
          "key": "availability",
          "badge": true
        },
        {
          "label": "Daily",
          "key": "dailyRate",
          "money": true
        },
        {
          "label": "Monthly",
          "key": "monthlyRate",
          "money": true
        }
      ],
      "formFields": [
        {
          "name": "vehicleNumber",
          "label": "Vehicle ID / Number",
          "type": "text",
          "required": true
        },
        {
          "name": "plateNumber",
          "label": "Plate Number",
          "type": "text",
          "required": true
        },
        {
          "name": "make",
          "label": "Make",
          "type": "text",
          "required": true
        },
        {
          "name": "model",
          "label": "Model",
          "type": "text",
          "required": true
        },
        {
          "name": "year",
          "label": "Year",
          "type": "number",
          "required": true
        },
        {
          "name": "color",
          "label": "Color",
          "type": "text"
        },
        {
          "name": "category",
          "label": "Category",
          "type": "select",
          "options": [
            "Sedan",
            "SUV",
            "Hatchback",
            "Coupe",
            "Luxury",
            "Pickup",
            "Van"
          ]
        },
        {
          "name": "transmission",
          "label": "Transmission",
          "type": "select",
          "options": [
            "Automatic",
            "Manual"
          ]
        },
        {
          "name": "fuelType",
          "label": "Fuel Type",
          "type": "select",
          "options": [
            "Petrol",
            "Diesel",
            "Hybrid",
            "Electric"
          ]
        },
        {
          "name": "vin",
          "label": "Chassis / VIN",
          "type": "text"
        },
        {
          "name": "status",
          "label": "Status",
          "type": "select",
          "options": [
            "Available",
            "Rented",
            "Maintenance",
            "Reserved",
            "Blocked"
          ]
        },
        {
          "name": "availability",
          "label": "Availability",
          "type": "select",
          "options": [
            "Available",
            "Unavailable"
          ]
        },
        {
          "name": "dailyRate",
          "label": "Daily Rate",
          "type": "number"
        },
        {
          "name": "weeklyRate",
          "label": "Weekly Rate",
          "type": "number"
        },
        {
          "name": "monthlyRate",
          "label": "Monthly Rate",
          "type": "number"
        },
        {
          "name": "deposit",
          "label": "Deposit",
          "type": "number"
        },
        {
          "name": "depositWaiver",
          "label": "Deposit Waiver",
          "type": "number"
        },
        {
          "name": "cdwService",
          "label": "CDW Service",
          "type": "select",
          "options": [
            "Included",
            "Optional",
            "Not Available"
          ]
        },
        {
          "name": "pickupService",
          "label": "Pickup Service",
          "type": "select",
          "options": [
            "Available",
            "Not Available"
          ]
        },
        {
          "name": "deliveryService",
          "label": "Delivery Service",
          "type": "select",
          "options": [
            "Available",
            "Not Available"
          ]
        },
        {
          "name": "insuranceExpiry",
          "label": "Insurance Expiry",
          "type": "date"
        },
        {
          "name": "registrationExpiry",
          "label": "Registration Expiry",
          "type": "date"
        },
        {
          "name": "serviceDueDate",
          "label": "Service Due Date",
          "type": "date"
        },
        {
          "name": "odometer",
          "label": "Odometer",
          "type": "number"
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]
    },
    "customers": {
      "title": "Customers",
      "icon": "👤",
      "storageKey": "customers",
      "searchFields": [
        "fullName",
        "passportNumber",
        "emiratesId",
        "mobile",
        "email"
      ],
      "sortBy": "fullName",
      "columns": [
        {
          "label": "Name",
          "key": "fullName"
        },
        {
          "label": "Mobile",
          "key": "mobile"
        },
        {
          "label": "Passport",
          "key": "passportNumber"
        },
        {
          "label": "Emirates ID",
          "key": "emiratesId"
        },
        {
          "label": "Status",
          "key": "activeContractStatus",
          "badge": true
        },
        {
          "label": "Balance",
          "key": "outstandingBalance",
          "money": true
        }
      ],
      "formFields": [
        {
          "name": "fullName",
          "label": "Full Name",
          "type": "text",
          "required": true
        },
        {
          "name": "mobile",
          "label": "Mobile Number",
          "type": "text",
          "required": true
        },
        {
          "name": "email",
          "label": "Email",
          "type": "email"
        },
        {
          "name": "passportNumber",
          "label": "Passport Number",
          "type": "text"
        },
        {
          "name": "passportExpiry",
          "label": "Passport Expiry",
          "type": "date"
        },
        {
          "name": "emiratesId",
          "label": "Emirates ID Number",
          "type": "text"
        },
        {
          "name": "emiratesIdExpiry",
          "label": "Emirates ID Expiry",
          "type": "date"
        },
        {
          "name": "licenseNumber",
          "label": "Driving License Number",
          "type": "text"
        },
        {
          "name": "licenseExpiry",
          "label": "License Expiry",
          "type": "date"
        },
        {
          "name": "issuingCountry",
          "label": "Issuing Country",
          "type": "text"
        },
        {
          "name": "nationality",
          "label": "Nationality",
          "type": "text"
        },
        {
          "name": "dob",
          "label": "Date of Birth",
          "type": "date"
        },
        {
          "name": "address",
          "label": "Address",
          "type": "textarea"
        },
        {
          "name": "companyName",
          "label": "Company Name",
          "type": "text"
        },
        {
          "name": "tradeLicenseNumber",
          "label": "Trade License Number",
          "type": "text"
        },
        {
          "name": "emergencyContact",
          "label": "Emergency Contact",
          "type": "text"
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        },
        {
          "name": "activeContractStatus",
          "label": "Active Contract Status",
          "type": "select",
          "options": [
            "Active",
            "Inactive",
            "Suspended"
          ]
        },
        {
          "name": "outstandingBalance",
          "label": "Outstanding Balance",
          "type": "number"
        }
      ]
    },
    "contracts": {
      "title": "Rental Contracts",
      "icon": "📄",
      "storageKey": "contracts",
      "searchFields": [
        "contractNumber",
        "customerName",
        "vehicleNumber",
        "plateNumber",
        "status"
      ],
      "sortBy": "contractDate",
      "columns": [
        {
          "label": "Contract #",
          "key": "contractNumber"
        },
        {
          "label": "Customer",
          "key": "customerName"
        },
        {
          "label": "Vehicle",
          "key": "vehicleNumber"
        },
        {
          "label": "Period",
          "key": "period"
        },
        {
          "label": "Status",
          "key": "status",
          "badge": true
        },
        {
          "label": "Due",
          "key": "dueAmount",
          "money": true
        }
      ],
      "formType": "contract"
    },
    "renewals": {
      "title": "Renewals",
      "icon": "🔁",
      "storageKey": "renewals",
      "searchFields": [
        "contractId",
        "renewalType",
        "notes"
      ],
      "sortBy": "createdAt",
      "columns": [
        {
          "label": "Renewal #",
          "key": "id"
        },
        {
          "label": "Contract",
          "key": "contractId"
        },
        {
          "label": "Type",
          "key": "renewalType"
        },
        {
          "label": "Dates",
          "key": "period"
        },
        {
          "label": "Amount",
          "key": "total",
          "money": true
        }
      ],
      "formFields": [
        {
          "name": "contractId",
          "label": "Contract",
          "type": "text",
          "required": true
        },
        {
          "name": "renewalType",
          "label": "Renewal Type",
          "type": "select",
          "options": [
            "Daily Extension",
            "Weekly Extension",
            "Monthly Renewal",
            "Partial Renewal",
            "Full Renewal"
          ]
        },
        {
          "name": "fromDate",
          "label": "From Date",
          "type": "date",
          "required": true
        },
        {
          "name": "toDate",
          "label": "To Date",
          "type": "date",
          "required": true
        },
        {
          "name": "addedDays",
          "label": "Added Days",
          "type": "number"
        },
        {
          "name": "amount",
          "label": "Amount",
          "type": "number"
        },
        {
          "name": "vat",
          "label": "VAT",
          "type": "number"
        },
        {
          "name": "total",
          "label": "Total",
          "type": "number"
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]
    },
    "invoices": {
      "title": "Invoices",
      "icon": "🧾",
      "storageKey": "invoices",
      "searchFields": [
        "invoiceNumber",
        "contractId",
        "customerId",
        "status"
      ],
      "sortBy": "issueDate",
      "columns": [
        {
          "label": "Invoice #",
          "key": "invoiceNumber"
        },
        {
          "label": "Contract",
          "key": "contractId"
        },
        {
          "label": "Issue Date",
          "key": "issueDate"
        },
        {
          "label": "Status",
          "key": "status",
          "badge": true
        },
        {
          "label": "Total",
          "key": "total",
          "money": true
        },
        {
          "label": "Balance",
          "key": "balance",
          "money": true
        }
      ],
      "formFields": [
        {
          "name": "invoiceNumber",
          "label": "Invoice Number",
          "type": "text"
        },
        {
          "name": "contractId",
          "label": "Contract ID",
          "type": "text"
        },
        {
          "name": "customerId",
          "label": "Customer ID",
          "type": "text"
        },
        {
          "name": "issueDate",
          "label": "Issue Date",
          "type": "date"
        },
        {
          "name": "status",
          "label": "Status",
          "type": "select",
          "options": [
            "Draft",
            "Issued",
            "Part Paid",
            "Paid",
            "Cancelled"
          ]
        },
        {
          "name": "subtotal",
          "label": "Subtotal",
          "type": "number"
        },
        {
          "name": "vat",
          "label": "VAT",
          "type": "number"
        },
        {
          "name": "total",
          "label": "Total",
          "type": "number"
        },
        {
          "name": "paid",
          "label": "Paid",
          "type": "number"
        },
        {
          "name": "balance",
          "label": "Balance",
          "type": "number"
        }
      ]
    },
    "receipts": {
      "title": "Receipts",
      "icon": "💳",
      "storageKey": "receipts",
      "searchFields": [
        "receiptNumber",
        "invoiceId",
        "contractId",
        "customerId",
        "method"
      ],
      "sortBy": "receivedDate",
      "columns": [
        {
          "label": "Receipt #",
          "key": "receiptNumber"
        },
        {
          "label": "Invoice",
          "key": "invoiceId"
        },
        {
          "label": "Date",
          "key": "receivedDate"
        },
        {
          "label": "Method",
          "key": "method"
        },
        {
          "label": "Amount",
          "key": "amount",
          "money": true
        }
      ],
      "formFields": [
        {
          "name": "receiptNumber",
          "label": "Receipt Number",
          "type": "text"
        },
        {
          "name": "invoiceId",
          "label": "Invoice ID",
          "type": "text"
        },
        {
          "name": "contractId",
          "label": "Contract ID",
          "type": "text"
        },
        {
          "name": "customerId",
          "label": "Customer ID",
          "type": "text"
        },
        {
          "name": "receivedDate",
          "label": "Received Date",
          "type": "datetime-local"
        },
        {
          "name": "amount",
          "label": "Amount",
          "type": "number"
        },
        {
          "name": "method",
          "label": "Method",
          "type": "select",
          "options": [
            "Cash",
            "Card",
            "Bank Transfer",
            "Online"
          ]
        },
        {
          "name": "balanceAfter",
          "label": "Balance After",
          "type": "number"
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]
    },
    "accounts": {
      "title": "Accounts",
      "icon": "🏦",
      "storageKey": "accounts",
      "searchFields": [
        "customerId"
      ],
      "sortBy": "lastUpdated",
      "columns": [
        {
          "label": "Customer",
          "key": "customerId"
        },
        {
          "label": "Opening",
          "key": "openingBalance",
          "money": true
        },
        {
          "label": "Debits",
          "key": "debits",
          "money": true
        },
        {
          "label": "Credits",
          "key": "credits",
          "money": true
        },
        {
          "label": "Closing",
          "key": "closingBalance",
          "money": true
        }
      ]
    },
    "ledger": {
      "title": "Ledger",
      "icon": "📚",
      "storageKey": "ledger",
      "searchFields": [
        "customerId",
        "contractId",
        "reference",
        "refType",
        "narration"
      ],
      "sortBy": "date",
      "columns": [
        {
          "label": "Date",
          "key": "date"
        },
        {
          "label": "Customer",
          "key": "customerId"
        },
        {
          "label": "Ref Type",
          "key": "refType"
        },
        {
          "label": "Reference",
          "key": "reference"
        },
        {
          "label": "Debit",
          "key": "debit",
          "money": true
        },
        {
          "label": "Credit",
          "key": "credit",
          "money": true
        },
        {
          "label": "Balance",
          "key": "balance",
          "money": true
        }
      ]
    },
    "maintenance": {
      "title": "Maintenance",
      "icon": "🛠️",
      "storageKey": "maintenance",
      "searchFields": [
        "vehicleId",
        "serviceType",
        "garage",
        "receiptReference"
      ],
      "sortBy": "serviceDate",
      "columns": [
        {
          "label": "Maintenance #",
          "key": "id"
        },
        {
          "label": "Vehicle",
          "key": "vehicleId"
        },
        {
          "label": "Service Date",
          "key": "serviceDate"
        },
        {
          "label": "Type",
          "key": "serviceType"
        },
        {
          "label": "Cost",
          "key": "cost",
          "money": true
        },
        {
          "label": "Status",
          "key": "status",
          "badge": true
        }
      ],
      "formFields": [
        {
          "name": "vehicleId",
          "label": "Vehicle ID",
          "type": "text",
          "required": true
        },
        {
          "name": "serviceDate",
          "label": "Service Date",
          "type": "date",
          "required": true
        },
        {
          "name": "serviceType",
          "label": "Service Type",
          "type": "text",
          "required": true
        },
        {
          "name": "garage",
          "label": "Garage / Workshop",
          "type": "text"
        },
        {
          "name": "odometer",
          "label": "Odometer Reading",
          "type": "number"
        },
        {
          "name": "cost",
          "label": "Cost",
          "type": "number"
        },
        {
          "name": "partsReplaced",
          "label": "Parts Replaced",
          "type": "text"
        },
        {
          "name": "nextServiceDue",
          "label": "Next Service Due",
          "type": "date"
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        },
        {
          "name": "receiptReference",
          "label": "Receipt Reference",
          "type": "text"
        },
        {
          "name": "status",
          "label": "Status",
          "type": "select",
          "options": [
            "Open",
            "Closed",
            "Pending Approval"
          ]
        }
      ]
    },
    "fines": {
      "title": "Traffic Fines",
      "icon": "🚨",
      "storageKey": "fines",
      "searchFields": [
        "fineNumber",
        "authority",
        "vehicleId",
        "contractId",
        "violation"
      ],
      "sortBy": "date",
      "columns": [
        {
          "label": "Fine #",
          "key": "fineNumber"
        },
        {
          "label": "Authority",
          "key": "authority"
        },
        {
          "label": "Date / Time",
          "key": "datetime"
        },
        {
          "label": "Violation",
          "key": "violation"
        },
        {
          "label": "Total",
          "key": "total",
          "money": true
        },
        {
          "label": "Assignment",
          "key": "assignmentStatus",
          "badge": true
        }
      ],
      "formFields": [
        {
          "name": "fineNumber",
          "label": "Fine Number",
          "type": "text",
          "required": true
        },
        {
          "name": "authority",
          "label": "Authority",
          "type": "text",
          "required": true
        },
        {
          "name": "vehicleId",
          "label": "Vehicle ID",
          "type": "text"
        },
        {
          "name": "contractId",
          "label": "Contract ID",
          "type": "text"
        },
        {
          "name": "customerId",
          "label": "Customer ID",
          "type": "text"
        },
        {
          "name": "date",
          "label": "Date",
          "type": "date",
          "required": true
        },
        {
          "name": "time",
          "label": "Time",
          "type": "time"
        },
        {
          "name": "violation",
          "label": "Violation",
          "type": "text"
        },
        {
          "name": "amount",
          "label": "Fine Amount",
          "type": "number",
          "required": true
        },
        {
          "name": "serviceFee",
          "label": "Service Fee 10%",
          "type": "number"
        },
        {
          "name": "serviceFeeVat",
          "label": "VAT on Service Fee",
          "type": "number"
        },
        {
          "name": "total",
          "label": "Total",
          "type": "number"
        },
        {
          "name": "status",
          "label": "Status",
          "type": "select",
          "options": [
            "Unpaid",
            "Paid",
            "Disputed"
          ]
        },
        {
          "name": "assignmentStatus",
          "label": "Assignment Status",
          "type": "select",
          "options": [
            "Matched",
            "Unmatched",
            "Manual Review"
          ]
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]
    },
    "tolls": {
      "title": "Salik & Darb",
      "icon": "🛣️",
      "storageKey": "tolls",
      "searchFields": [
        "tollSystem",
        "vehicleId",
        "contractId",
        "notes"
      ],
      "sortBy": "date",
      "columns": [
        {
          "label": "Toll #",
          "key": "id"
        },
        {
          "label": "System",
          "key": "tollSystem"
        },
        {
          "label": "Date / Time",
          "key": "datetime"
        },
        {
          "label": "Vehicle",
          "key": "vehicleId"
        },
        {
          "label": "Amount",
          "key": "total",
          "money": true
        },
        {
          "label": "Assignment",
          "key": "assignmentStatus",
          "badge": true
        }
      ],
      "formFields": [
        {
          "name": "tollSystem",
          "label": "Toll System",
          "type": "select",
          "options": [
            "Salik",
            "Darb"
          ],
          "required": true
        },
        {
          "name": "vehicleId",
          "label": "Vehicle ID",
          "type": "text",
          "required": true
        },
        {
          "name": "contractId",
          "label": "Contract ID",
          "type": "text"
        },
        {
          "name": "customerId",
          "label": "Customer ID",
          "type": "text"
        },
        {
          "name": "date",
          "label": "Date",
          "type": "date",
          "required": true
        },
        {
          "name": "time",
          "label": "Time",
          "type": "time"
        },
        {
          "name": "amount",
          "label": "Toll Amount",
          "type": "number",
          "required": true
        },
        {
          "name": "vat",
          "label": "VAT",
          "type": "number"
        },
        {
          "name": "total",
          "label": "Total",
          "type": "number"
        },
        {
          "name": "status",
          "label": "Status",
          "type": "select",
          "options": [
            "Unpaid",
            "Paid"
          ]
        },
        {
          "name": "assignmentStatus",
          "label": "Assignment Status",
          "type": "select",
          "options": [
            "Matched",
            "Unmatched",
            "Manual Review"
          ]
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]
    },
    "charges": {
      "title": "Other Charges",
      "icon": "➕",
      "storageKey": "charges",
      "searchFields": [
        "contractId",
        "customerId",
        "type",
        "notes"
      ],
      "sortBy": "date",
      "columns": [
        {
          "label": "Charge #",
          "key": "id"
        },
        {
          "label": "Type",
          "key": "type"
        },
        {
          "label": "Date",
          "key": "date"
        },
        {
          "label": "Amount",
          "key": "amount",
          "money": true
        },
        {
          "label": "Total",
          "key": "total",
          "money": true
        }
      ],
      "formFields": [
        {
          "name": "contractId",
          "label": "Contract ID",
          "type": "text",
          "required": true
        },
        {
          "name": "customerId",
          "label": "Customer ID",
          "type": "text",
          "required": true
        },
        {
          "name": "vehicleId",
          "label": "Vehicle ID",
          "type": "text"
        },
        {
          "name": "date",
          "label": "Date",
          "type": "date",
          "required": true
        },
        {
          "name": "type",
          "label": "Charge Type",
          "type": "select",
          "options": [
            "Fuel",
            "Cleaning",
            "Damage",
            "Late Return",
            "Miscellaneous",
            "Admin",
            "Collection",
            "Replacement Card",
            "Key Loss"
          ]
        },
        {
          "name": "amount",
          "label": "Amount",
          "type": "number",
          "required": true
        },
        {
          "name": "vat",
          "label": "VAT",
          "type": "number"
        },
        {
          "name": "total",
          "label": "Total",
          "type": "number"
        },
        {
          "name": "notes",
          "label": "Notes",
          "type": "textarea"
        }
      ]
    },
    "settings": {
      "title": "Settings",
      "icon": "⚙️",
      "storageKey": "settings",
      "searchFields": [
        "companyName",
        "trn"
      ],
      "columns": [
        {
          "label": "Company",
          "key": "companyName"
        },
        {
          "label": "TRN",
          "key": "trn"
        },
        {
          "label": "VAT",
          "key": "vatRate",
          "percent": true
        },
        {
          "label": "Theme",
          "key": "themeLabel"
        }
      ]
    }
  }
};
})();
