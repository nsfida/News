(() => {
  const W = window;

  W.PCR_DEFAULT_DATA = {
  "vehicles": [
    {
      "id": "veh_1001",
      "vehicleId": "V-1001",
      "vehicleNumber": "PCR-001",
      "plateNumber": "12345",
      "make": "Lexus",
      "model": "ES 350",
      "year": 2024,
      "color": "Pearl White",
      "category": "Sedan",
      "transmission": "Automatic",
      "fuelType": "Petrol",
      "chassisVin": "JTJBFMCA1R1234567",
      "status": "Rented",
      "availability": "Unavailable",
      "dailyRate": 280,
      "weeklyRate": 1650,
      "monthlyRate": 5400,
      "deposit": 1500,
      "depositWaiver": false,
      "cdwService": true,
      "pickupService": true,
      "deliveryService": true,
      "insuranceExpiry": "2026-12-31",
      "registrationExpiry": "2026-10-15",
      "serviceDueDate": "2026-06-10",
      "odometer": 18420,
      "notes": "Premium executive sedan.",
      "maintenanceHistory": [
        "mtn_1002"
      ],
      "rentalHistory": [
        "con_1001"
      ]
    },
    {
      "id": "veh_1002",
      "vehicleId": "V-1002",
      "vehicleNumber": "PCR-014",
      "plateNumber": "98765",
      "make": "Nissan",
      "model": "Patrol",
      "year": 2023,
      "color": "Black",
      "category": "SUV",
      "transmission": "Automatic",
      "fuelType": "Petrol",
      "chassisVin": "JN8BR1NW9PW123456",
      "status": "Available",
      "availability": "Available",
      "dailyRate": 450,
      "weeklyRate": 2600,
      "monthlyRate": 8500,
      "deposit": 2500,
      "depositWaiver": false,
      "cdwService": true,
      "pickupService": false,
      "deliveryService": true,
      "insuranceExpiry": "2026-11-20",
      "registrationExpiry": "2026-08-01",
      "serviceDueDate": "2026-05-15",
      "odometer": 25105,
      "notes": "Family SUV; ready for long-term rental.",
      "maintenanceHistory": [
        "mtn_1001"
      ],
      "rentalHistory": []
    }
  ],
  "customers": [
    {
      "id": "cus_1001",
      "customerId": "C-1001",
      "fullName": "Ayesha Khan",
      "passportNumber": "P1234567",
      "passportExpiry": "2027-03-22",
      "emiratesId": "784-1990-1234567-1",
      "emiratesIdExpiry": "2027-10-30",
      "licenseNumber": "D-8899001",
      "licenseExpiry": "2027-05-18",
      "issuanceCountry": "Pakistan",
      "nationality": "Pakistani",
      "dateOfBirth": "1990-08-14",
      "mobileNumber": "+971501112233",
      "email": "ayesha@example.com",
      "address": "Dubai Marina, Dubai, UAE",
      "companyName": "Blue Horizon Trading LLC",
      "tradeLicenseNumber": "TL-771122",
      "emergencyContact": "+971552223344",
      "notes": "Corporate customer.",
      "documentsMetadata": "Passport, EID, License uploaded",
      "activeContractStatus": "Active",
      "outstandingBalance": 1260
    },
    {
      "id": "cus_1002",
      "customerId": "C-1002",
      "fullName": "Mohamed Hassan",
      "passportNumber": "P7654321",
      "passportExpiry": "2028-01-11",
      "emiratesId": "784-1988-7654321-3",
      "emiratesIdExpiry": "2027-09-14",
      "licenseNumber": "D-2233445",
      "licenseExpiry": "2027-07-30",
      "issuanceCountry": "UAE",
      "nationality": "Emirati",
      "dateOfBirth": "1988-02-03",
      "mobileNumber": "+971509998877",
      "email": "mohamed@example.com",
      "address": "Al Barsha, Dubai, UAE",
      "companyName": "",
      "tradeLicenseNumber": "",
      "emergencyContact": "+971505556666",
      "notes": "Walk-in retail customer.",
      "documentsMetadata": "Passport and EID verified",
      "activeContractStatus": "Inactive",
      "outstandingBalance": 0
    }
  ],
  "contracts": [
    {
      "id": "con_1001",
      "contractNumber": "CTR-2026-0001",
      "customerId": "cus_1001",
      "vehicleId": "veh_1001",
      "rentalStartDate": "2026-04-01",
      "rentalEndDate": "2026-04-30",
      "rateType": "monthly",
      "rentalDuration": 30,
      "dailyRate": 280,
      "weeklyRate": 1650,
      "monthlyRate": 5400,
      "deposit": 1500,
      "depositWaiver": false,
      "cdwService": true,
      "pickupService": true,
      "deliveryService": true,
      "salikCharges": 120,
      "trafficFines": 0,
      "fuelCharges": 0,
      "cleaningCharges": 0,
      "damageCharges": 0,
      "otherCharges": 0,
      "advancePayment": 3000,
      "discount": 200,
      "totalAmount": 5520,
      "paidAmount": 3000,
      "dueAmount": 2520,
      "contractStatus": "Active",
      "contractNotes": "First corporate rental.",
      "closureSummary": ""
    }
  ],
  "renewals": [
    {
      "id": "ren_1001",
      "renewalNumber": "REN-2026-0001",
      "contractId": "con_1001",
      "renewalType": "weekly",
      "extensionDays": 7,
      "newEndDate": "2026-05-07",
      "amount": 1650,
      "paidAmount": 1200,
      "dueAmount": 450,
      "status": "Open",
      "notes": "Weekly renewal after April cycle."
    }
  ],
  "accounts": [
    {
      "id": "acc_1001",
      "accountNumber": "ACC-1001",
      "customerId": "cus_1001",
      "openingBalance": 0,
      "currentBalance": 1260,
      "lastTransactionDate": "2026-04-02",
      "status": "Open",
      "notes": "Automatically synced from ledger."
    },
    {
      "id": "acc_1002",
      "accountNumber": "ACC-1002",
      "customerId": "cus_1002",
      "openingBalance": 0,
      "currentBalance": 0,
      "lastTransactionDate": "2026-03-20",
      "status": "Open",
      "notes": "No outstanding items."
    }
  ],
  "ledger": [
    {
      "id": "led_1001",
      "ledgerNumber": "LED-2026-0001",
      "customerId": "cus_1001",
      "contractId": "con_1001",
      "entryDate": "2026-04-01",
      "entryType": "invoice",
      "amount": 5520,
      "narration": "Monthly rental invoice",
      "reference": "CTR-2026-0001",
      "balanceAfter": 2520,
      "notes": ""
    },
    {
      "id": "led_1002",
      "ledgerNumber": "LED-2026-0002",
      "customerId": "cus_1001",
      "contractId": "con_1001",
      "entryDate": "2026-04-02",
      "entryType": "payment",
      "amount": 3000,
      "narration": "Advance payment received",
      "reference": "RCPT-3001",
      "balanceAfter": 2520,
      "notes": ""
    }
  ],
  "maintenance": [
    {
      "id": "mtn_1001",
      "maintenanceId": "MNT-0001",
      "vehicleId": "veh_1002",
      "serviceDate": "2026-03-18",
      "serviceType": "Oil service",
      "garage": "Al Futtaim Workshop",
      "odometerReading": 25090,
      "cost": 620,
      "partsReplaced": "Oil filter, engine oil",
      "nextServiceDue": "2026-06-18",
      "notes": "Routine service completed.",
      "receiptReference": "RF-2211",
      "status": "Closed"
    },
    {
      "id": "mtn_1002",
      "maintenanceId": "MNT-0002",
      "vehicleId": "veh_1001",
      "serviceDate": "2026-04-01",
      "serviceType": "Inspection",
      "garage": "Internal Bay",
      "odometerReading": 18410,
      "cost": 140,
      "partsReplaced": "",
      "nextServiceDue": "2026-05-01",
      "notes": "Pre-rental inspection.",
      "receiptReference": "INT-0033",
      "status": "Closed"
    }
  ],
  "fines": [
    {
      "id": "fin_1001",
      "fineNumber": "FIN-0001",
      "customerId": "cus_1001",
      "vehicleId": "veh_1001",
      "contractId": "con_1001",
      "issueDate": "2026-04-03",
      "authority": "Dubai Police",
      "fineType": "Traffic fine",
      "amount": 300,
      "status": "Open",
      "dueDate": "2026-04-20",
      "notes": "Speeding violation."
    }
  ],
  "charges": [
    {
      "id": "chg_1001",
      "chargeNumber": "CHG-0001",
      "customerId": "cus_1001",
      "vehicleId": "veh_1001",
      "contractId": "con_1001",
      "chargeDate": "2026-04-02",
      "chargeType": "Salik",
      "amount": 120,
      "tax": 0,
      "status": "Pending",
      "notes": "Salik / toll gate usage."
    }
  ],
  "settings": {
    "companyName": "Premium Car Rental UAE",
    "brandTagline": "Luxury mobility, precise operations.",
    "phone": "+971 4 360 9991",
    "emailPrimary": "contact@pcr.ae",
    "emailAccounts": "accounts@pcr.ae",
    "emailOperations": "mo@pcr.ae",
    "currency": "AED",
    "currencySymbol": "AED",
    "dateFormat": "YYYY-MM-DD",
    "theme": "pink-premium",
    "defaultDailyRate": 250,
    "defaultWeeklyRate": 1500,
    "defaultMonthlyRate": 4800,
    "defaultDeposit": 1000,
    "notes": "All data is managed locally in the browser.",
    "sessionStatus": "Saved locally"
  }
};

  const contractStatuses = [
    "Draft",
    "Active",
    "Overdue",
    "Closed",
    "Completed",
    "Cancelled",
  ];

  const rateTypes = [
    "daily",
    "weekly",
    "monthly",
  ];

  const renewalTypes = [
    "daily",
    "weekly",
    "monthly",
    "partial",
    "full",
  ];

  const entryTypes = [
    "invoice",
    "debit",
    "credit",
    "payment",
    "deposit",
    "refund",
    "fine",
    "toll",
    "adjustment",
  ];

  const chargeTypes = [
    "Salik",
    "Traffic fine",
    "Parking",
    "Fuel",
    "Cleaning",
    "Damage",
    "Late return",
    "Miscellaneous",
  ];

  const serviceTypes = [
    "Oil service",
    "Inspection",
    "Repair",
    "Tyre replacement",
    "Brake work",
    "AC service",
    "Body work",
    "Preventive maintenance",
  ];

  const moduleConfigs = {
    vehicles: {
      title: "Vehicles",
      exportFile: "vehicles.json",
      icon: "🚘",
      storageKey: "vehicles",
      searchPlaceholder: "Search vehicles by number, plate, VIN, make, or model...",
      relationLookups: {},
      columns: [
        "vehicleId", "vehicleNumber", "plateNumber", "make", "model", "year", "category", "status", "availability", "dailyRate"
      ],
      fields: [
        { name: "vehicleId", label: "Vehicle ID", type: "text", required: true },
        { name: "vehicleNumber", label: "Vehicle Number", type: "text", required: true },
        { name: "plateNumber", label: "Plate Number", type: "text", required: true },
        { name: "make", label: "Make", type: "text", required: true },
        { name: "model", label: "Model", type: "text", required: true },
        { name: "year", label: "Year", type: "number", required: true },
        { name: "color", label: "Color", type: "text" },
        { name: "category", label: "Category", type: "select", options: ["Sedan", "SUV", "Coupe", "Hatchback", "Van", "Luxury", "Convertible"] },
        { name: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
        { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"] },
        { name: "chassisVin", label: "Chassis / VIN", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Available", "Rented", "Maintenance", "Reserved", "Inactive"] },
        { name: "availability", label: "Availability", type: "select", options: ["Available", "Unavailable"] },
        { name: "dailyRate", label: "Daily Rate", type: "number" },
        { name: "weeklyRate", label: "Weekly Rate", type: "number" },
        { name: "monthlyRate", label: "Monthly Rate", type: "number" },
        { name: "deposit", label: "Deposit", type: "number" },
        { name: "depositWaiver", label: "Deposit Waiver", type: "checkbox" },
        { name: "cdwService", label: "CDW Service", type: "checkbox" },
        { name: "pickupService", label: "Pickup Service", type: "checkbox" },
        { name: "deliveryService", label: "Delivery Service", type: "checkbox" },
        { name: "insuranceExpiry", label: "Insurance Expiry", type: "date" },
        { name: "registrationExpiry", label: "Registration Expiry", type: "date" },
        { name: "serviceDueDate", label: "Service Due Date", type: "date" },
        { name: "odometer", label: "Odometer", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    customers: {
      title: "Customers",
      exportFile: "customers.json",
      icon: "👤",
      storageKey: "customers",
      searchPlaceholder: "Search customers by name, passport, Emirates ID, mobile, or email...",
      columns: ["customerId", "fullName", "mobileNumber", "email", "nationality", "activeContractStatus", "outstandingBalance"],
      fields: [
        { name: "customerId", label: "Customer ID", type: "text", required: true },
        { name: "fullName", label: "Full Name", type: "text", required: true },
        { name: "passportNumber", label: "Passport Number", type: "text" },
        { name: "passportExpiry", label: "Passport Expiry", type: "date" },
        { name: "emiratesId", label: "Emirates ID Number", type: "text" },
        { name: "emiratesIdExpiry", label: "Emirates ID Expiry", type: "date" },
        { name: "licenseNumber", label: "Driving License Number", type: "text" },
        { name: "licenseExpiry", label: "Driving License Expiry", type: "date" },
        { name: "issuanceCountry", label: "Issuance Country", type: "text" },
        { name: "nationality", label: "Nationality", type: "text" },
        { name: "dateOfBirth", label: "Date of Birth", type: "date" },
        { name: "mobileNumber", label: "Mobile Number", type: "text" },
        { name: "email", label: "Email", type: "text" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "companyName", label: "Company Name", type: "text" },
        { name: "tradeLicenseNumber", label: "Trade License Number", type: "text" },
        { name: "emergencyContact", label: "Emergency Contact", type: "text" },
        { name: "documentsMetadata", label: "Documents Metadata", type: "textarea" },
        { name: "activeContractStatus", label: "Active Contract Status", type: "select", options: ["Active", "Inactive", "Suspended"] },
        { name: "outstandingBalance", label: "Outstanding Balance", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    contracts: {
      title: "Rental Contracts",
      exportFile: "contracts.json",
      icon: "📄",
      storageKey: "contracts",
      searchPlaceholder: "Search contracts by contract number, customer, vehicle, or status...",
      columns: ["contractNumber", "customerId", "vehicleId", "rentalStartDate", "rentalEndDate", "rateType", "totalAmount", "paidAmount", "dueAmount", "contractStatus"],
      relationLookups: {
        customerId: { section: "customers", labelKey: "fullName" },
        vehicleId: { section: "vehicles", labelKey: "vehicleNumber" },
      },
      fields: [
        { name: "contractNumber", label: "Contract Number", type: "text", required: true },
        { name: "customerId", label: "Customer", type: "select", relation: "customers", required: true },
        { name: "vehicleId", label: "Vehicle", type: "select", relation: "vehicles", required: true },
        { name: "rentalStartDate", label: "Rental Start Date", type: "date", required: true },
        { name: "rentalEndDate", label: "Rental End Date", type: "date", required: true },
        { name: "rateType", label: "Rate Type", type: "select", options: rateTypes, required: true },
        { name: "rentalDuration", label: "Rental Duration (Days)", type: "number" },
        { name: "dailyRate", label: "Daily Rate", type: "number" },
        { name: "weeklyRate", label: "Weekly Rate", type: "number" },
        { name: "monthlyRate", label: "Monthly Rate", type: "number" },
        { name: "deposit", label: "Deposit", type: "number" },
        { name: "depositWaiver", label: "Deposit Waiver", type: "checkbox" },
        { name: "cdwService", label: "CDW Service", type: "checkbox" },
        { name: "pickupService", label: "Pickup Service", type: "checkbox" },
        { name: "deliveryService", label: "Delivery Service", type: "checkbox" },
        { name: "salikCharges", label: "Toll / Salik Charges", type: "number" },
        { name: "trafficFines", label: "Traffic Fines", type: "number" },
        { name: "fuelCharges", label: "Fuel Charges", type: "number" },
        { name: "cleaningCharges", label: "Cleaning Charges", type: "number" },
        { name: "damageCharges", label: "Damage Charges", type: "number" },
        { name: "otherCharges", label: "Other Charges", type: "number" },
        { name: "advancePayment", label: "Advance Payment", type: "number" },
        { name: "discount", label: "Discount", type: "number" },
        { name: "totalAmount", label: "Total Amount", type: "number", readonly: true },
        { name: "paidAmount", label: "Paid Amount", type: "number" },
        { name: "dueAmount", label: "Due Amount", type: "number", readonly: true },
        { name: "contractStatus", label: "Contract Status", type: "select", options: contractStatuses },
        { name: "contractNotes", label: "Contract Notes", type: "textarea" },
        { name: "closureSummary", label: "Closure Summary", type: "textarea" },
      ]
    },
    renewals: {
      title: "Renewals and Extensions",
      exportFile: "renewals.json",
      icon: "🔁",
      storageKey: "renewals",
      searchPlaceholder: "Search renewals by renewal number, contract, or status...",
      relationLookups: {
        contractId: { section: "contracts", labelKey: "contractNumber" }
      },
      columns: ["renewalNumber", "contractId", "renewalType", "extensionDays", "newEndDate", "amount", "paidAmount", "dueAmount", "status"],
      fields: [
        { name: "renewalNumber", label: "Renewal Number", type: "text", required: true },
        { name: "contractId", label: "Contract", type: "select", relation: "contracts", required: true },
        { name: "renewalType", label: "Renewal Type", type: "select", options: renewalTypes, required: true },
        { name: "extensionDays", label: "Extension Days", type: "number" },
        { name: "newEndDate", label: "New End Date", type: "date" },
        { name: "amount", label: "Amount", type: "number" },
        { name: "paidAmount", label: "Paid Amount", type: "number" },
        { name: "dueAmount", label: "Due Amount", type: "number", readonly: true },
        { name: "status", label: "Status", type: "select", options: ["Open", "Closed", "Partially Paid", "Cancelled"] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    accounts: {
      title: "Accounts",
      exportFile: "accounts.json",
      icon: "💳",
      storageKey: "accounts",
      searchPlaceholder: "Search accounts by customer or account number...",
      relationLookups: {
        customerId: { section: "customers", labelKey: "fullName" }
      },
      columns: ["accountNumber", "customerId", "openingBalance", "currentBalance", "lastTransactionDate", "status"],
      fields: [
        { name: "accountNumber", label: "Account Number", type: "text", required: true },
        { name: "customerId", label: "Customer", type: "select", relation: "customers", required: true },
        { name: "openingBalance", label: "Opening Balance", type: "number" },
        { name: "currentBalance", label: "Current Balance", type: "number" },
        { name: "lastTransactionDate", label: "Last Transaction Date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Open", "Closed", "Suspended"] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    ledger: {
      title: "Ledger",
      exportFile: "ledger.json",
      icon: "📒",
      storageKey: "ledger",
      searchPlaceholder: "Search ledger by customer, date, amount, type, or reference...",
      relationLookups: {
        customerId: { section: "customers", labelKey: "fullName" },
        contractId: { section: "contracts", labelKey: "contractNumber" }
      },
      columns: ["ledgerNumber", "customerId", "entryDate", "entryType", "amount", "reference", "balanceAfter"],
      fields: [
        { name: "ledgerNumber", label: "Ledger Number", type: "text", required: true },
        { name: "customerId", label: "Customer", type: "select", relation: "customers", required: true },
        { name: "contractId", label: "Contract", type: "select", relation: "contracts" },
        { name: "entryDate", label: "Entry Date", type: "date", required: true },
        { name: "entryType", label: "Entry Type", type: "select", options: entryTypes, required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "narration", label: "Narration", type: "text", required: true },
        { name: "reference", label: "Reference", type: "text" },
        { name: "balanceAfter", label: "Balance After", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    maintenance: {
      title: "Maintenance",
      exportFile: "maintenance.json",
      icon: "🛠️",
      storageKey: "maintenance",
      searchPlaceholder: "Search maintenance by vehicle, service type, garage, or date...",
      relationLookups: {
        vehicleId: { section: "vehicles", labelKey: "vehicleNumber" }
      },
      columns: ["maintenanceId", "vehicleId", "serviceDate", "serviceType", "garage", "cost", "status"],
      fields: [
        { name: "maintenanceId", label: "Maintenance ID", type: "text", required: true },
        { name: "vehicleId", label: "Vehicle", type: "select", relation: "vehicles", required: true },
        { name: "serviceDate", label: "Service Date", type: "date", required: true },
        { name: "serviceType", label: "Service Type", type: "select", options: serviceTypes },
        { name: "garage", label: "Garage / Workshop", type: "text" },
        { name: "odometerReading", label: "Odometer Reading", type: "number" },
        { name: "cost", label: "Cost", type: "number" },
        { name: "partsReplaced", label: "Parts Replaced", type: "textarea" },
        { name: "nextServiceDue", label: "Next Service Due", type: "date" },
        { name: "receiptReference", label: "Receipt Reference", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    fines: {
      title: "Traffic Fines",
      exportFile: "fines.json",
      icon: "🚨",
      storageKey: "fines",
      searchPlaceholder: "Search fines by customer, vehicle, authority, or fine number...",
      relationLookups: {
        customerId: { section: "customers", labelKey: "fullName" },
        vehicleId: { section: "vehicles", labelKey: "vehicleNumber" },
        contractId: { section: "contracts", labelKey: "contractNumber" },
      },
      columns: ["fineNumber", "customerId", "vehicleId", "issueDate", "fineType", "amount", "status"],
      fields: [
        { name: "fineNumber", label: "Fine Number", type: "text", required: true },
        { name: "customerId", label: "Customer", type: "select", relation: "customers", required: true },
        { name: "vehicleId", label: "Vehicle", type: "select", relation: "vehicles", required: true },
        { name: "contractId", label: "Contract", type: "select", relation: "contracts" },
        { name: "issueDate", label: "Issue Date", type: "date", required: true },
        { name: "authority", label: "Authority", type: "text" },
        { name: "fineType", label: "Fine Type", type: "text" },
        { name: "amount", label: "Amount", type: "number" },
        { name: "dueDate", label: "Due Date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Open", "Paid", "Disputed", "Cancelled"] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    charges: {
      title: "Other Charges",
      exportFile: "charges.json",
      icon: "🧾",
      storageKey: "charges",
      searchPlaceholder: "Search charges by customer, contract, type, or date...",
      relationLookups: {
        customerId: { section: "customers", labelKey: "fullName" },
        vehicleId: { section: "vehicles", labelKey: "vehicleNumber" },
        contractId: { section: "contracts", labelKey: "contractNumber" },
      },
      columns: ["chargeNumber", "customerId", "contractId", "chargeDate", "chargeType", "amount", "status"],
      fields: [
        { name: "chargeNumber", label: "Charge Number", type: "text", required: true },
        { name: "customerId", label: "Customer", type: "select", relation: "customers", required: true },
        { name: "vehicleId", label: "Vehicle", type: "select", relation: "vehicles" },
        { name: "contractId", label: "Contract", type: "select", relation: "contracts" },
        { name: "chargeDate", label: "Charge Date", type: "date", required: true },
        { name: "chargeType", label: "Charge Type", type: "select", options: chargeTypes },
        { name: "amount", label: "Amount", type: "number" },
        { name: "tax", label: "Tax", type: "number" },
        { name: "status", label: "Status", type: "select", options: ["Pending", "Paid", "Waived", "Cancelled"] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    },
    reports: {
      title: "Reports",
      exportFile: null,
      icon: "📊",
      storageKey: null,
      searchPlaceholder: "",
      fields: []
    },
    json: {
      title: "JSON Import / Export",
      exportFile: null,
      icon: "⬇️",
      storageKey: null,
      searchPlaceholder: "",
      fields: []
    },
    settings: {
      title: "Settings",
      exportFile: "settings.json",
      icon: "⚙️",
      storageKey: "settings",
      searchPlaceholder: "",
      columns: ["companyName", "phone", "currency", "theme"],
      fields: [
        { name: "companyName", label: "Company Name", type: "text", required: true },
        { name: "brandTagline", label: "Brand Tagline", type: "text" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "emailPrimary", label: "Primary Email", type: "text" },
        { name: "emailOperations", label: "Operations Email", type: "text" },
        { name: "emailAccounts", label: "Accounts Email", type: "text" },
        { name: "currency", label: "Currency", type: "text" },
        { name: "currencySymbol", label: "Currency Symbol", type: "text" },
        { name: "dateFormat", label: "Date Format", type: "text" },
        { name: "theme", label: "Theme", type: "select", options: ["pink-premium", "rose-white", "blush-dark"] },
        { name: "defaultDailyRate", label: "Default Daily Rate", type: "number" },
        { name: "defaultWeeklyRate", label: "Default Weekly Rate", type: "number" },
        { name: "defaultMonthlyRate", label: "Default Monthly Rate", type: "number" },
        { name: "defaultDeposit", label: "Default Deposit", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]
    }
  };

  function calcRateAmount(contract) {
    const days = Math.max(1, Number(contract.rentalDuration) || (window.PCR.daysBetween(contract.rentalStartDate, contract.rentalEndDate) + 1) || 1);
    const dailyRate = Number(contract.dailyRate || 0);
    const weeklyRate = Number(contract.weeklyRate || 0);
    const monthlyRate = Number(contract.monthlyRate || 0);
    let base = 0;
    if (contract.rateType === "daily") {
      base = dailyRate * days;
    } else if (contract.rateType === "weekly") {
      base = weeklyRate * Math.ceil(days / 7);
    } else {
      base = monthlyRate * Math.ceil(days / 30);
    }
    const services = Number(contract.salikCharges || 0) + Number(contract.trafficFines || 0) + Number(contract.fuelCharges || 0) + Number(contract.cleaningCharges || 0) + Number(contract.damageCharges || 0) + Number(contract.otherCharges || 0);
    const extras = (contract.cdwService ? 75 : 0) + (contract.pickupService ? 50 : 0) + (contract.deliveryService ? 50 : 0);
    const discount = Number(contract.discount || 0);
    const total = Math.max(0, base + services + extras - discount);
    const paid = Number(contract.paidAmount || 0) + Number(contract.advancePayment || 0);
    const due = Math.max(0, total - paid);
    return {
      rentalDays: days,
      baseAmount: base,
      serviceAmount: services + extras,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: due,
    };
  }

  function calcRenewalAmount(renewal, contract) {
    const baseContract = contract || {};
    const days = Math.max(1, Number(renewal.extensionDays) || 1);
    let amount = 0;
    if (renewal.renewalType === "daily") amount = Number(baseContract.dailyRate || 0) * days;
    else if (renewal.renewalType === "weekly") amount = Number(baseContract.weeklyRate || 0) * Math.ceil(days / 7);
    else if (renewal.renewalType === "monthly") amount = Number(baseContract.monthlyRate || 0) * Math.ceil(days / 30);
    else if (renewal.renewalType === "full") amount = Number(baseContract.monthlyRate || 0) * 1;
    else amount = Number(baseContract.dailyRate || 0) * days;
    const paid = Number(renewal.paidAmount || 0);
    return {
      amount,
      dueAmount: Math.max(0, amount - paid),
    };
  }

  function ledgerEffect(entry) {
    const type = String(entry.entryType || "").toLowerCase();
    const amt = Number(entry.amount || 0);
    if (["payment", "credit", "deposit", "refund"].includes(type)) return -amt;
    if (["invoice", "debit", "fine", "toll", "adjustment"].includes(type)) return amt;
    return amt;
  }

  function customerBalance(customerId, store) {
    const ledger = (store.ledger || []).filter((row) => row.customerId === customerId);
    return ledger.reduce((bal, entry) => bal + ledgerEffect(entry), 0);
  }

  function syncAccounts(store) {
    const customers = store.customers || [];
    store.accounts = customers.map((customer, index) => {
      const existing = (store.accounts || []).find((a) => a.customerId === customer.id) || {};
      const currentBalance = customerBalance(customer.id, store);
      return {
        id: existing.id || `acc_${index + 1}`,
        accountNumber: existing.accountNumber || `ACC-${String(index + 1).padStart(4, "0")}`,
        customerId: customer.id,
        openingBalance: existing.openingBalance || 0,
        currentBalance,
        lastTransactionDate: (store.ledger || []).filter((l) => l.customerId === customer.id).sort((a, b) => String(b.entryDate).localeCompare(String(a.entryDate)))[0]?.entryDate || "",
        status: currentBalance > 0 ? "Open" : "Open",
        notes: existing.notes || "Synced from ledger and contracts.",
      };
    });
    return store;
  }

  function syncVehicleAvailability(store, vehicleId) {
    const vehicle = (store.vehicles || []).find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const activeContract = (store.contracts || []).find((c) => c.vehicleId === vehicleId && ["Active", "Overdue"].includes(c.contractStatus));
    vehicle.status = activeContract ? "Rented" : vehicle.status === "Rented" ? "Available" : vehicle.status;
    vehicle.availability = activeContract ? "Unavailable" : "Available";
  }

  function resolveRelation(section, id) {
    const store = window.PCR_STORE || W.PCR_DEFAULT_DATA;
    const list = store[section] || [];
    const item = list.find((x) => x.id === id);
    if (!item) return "—";
    if (section === "customers") return item.fullName || item.customerId || "—";
    if (section === "vehicles") return item.vehicleNumber || item.vehicleId || "—";
    if (section === "contracts") return item.contractNumber || "—";
    if (section === "accounts") return item.accountNumber || "—";
    if (section === "maintenance") return item.maintenanceId || "—";
    return item.name || item.id || "—";
  }

  function getDashboardSummary(store) {
    const vehicles = store.vehicles || [];
    const customers = store.customers || [];
    const contracts = store.contracts || [];
    const renewals = store.renewals || [];
    const maintenance = store.maintenance || [];
    const fines = store.fines || [];
    const ledger = store.ledger || [];
    const availableVehicles = vehicles.filter((v) => String(v.availability).toLowerCase() === "available").length;
    const rentedVehicles = vehicles.filter((v) => String(v.status).toLowerCase() === "rented").length;
    const activeContracts = contracts.filter((c) => ["Active", "Overdue"].includes(c.contractStatus)).length;
    const renewalDue = renewals.filter((r) => ["Open", "Partially Paid"].includes(r.status)).length;
    const pendingMaintenance = maintenance.filter((m) => ["Open", "In Progress"].includes(m.status)).length;
    const pendingFines = fines.filter((f) => ["Open", "Disputed"].includes(f.status)).length;
    const outstandingBalance = customers.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);
    const monthKey = window.PCR.monthKey();
    const monthlyIncome = ledger
      .filter((row) => ["payment", "credit"].includes(String(row.entryType || "").toLowerCase()) && String(row.entryDate || "").startsWith(monthKey))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return {
      totalVehicles: vehicles.length,
      availableVehicles,
      rentedVehicles,
      activeCustomers: customers.filter((c) => String(c.activeContractStatus).toLowerCase() === "active").length,
      activeContracts,
      renewalDue,
      pendingMaintenance,
      pendingFines,
      outstandingBalance,
      monthlyIncome,
    };
  }

  function getRecent(store, section, count = 5) {
    return (store[section] || []).slice().sort((a, b) => String(b.id).localeCompare(String(a.id))).slice(0, count);
  }

  function refreshDerivedData(store) {
    const next = window.PCR.clone(store);
    next.contracts = (next.contracts || []).map((contract) => {
      const calc = calcRateAmount(contract);
      return { ...contract, ...calc, paidAmount: Number(contract.paidAmount || 0) };
    });
    next.renewals = (next.renewals || []).map((renewal) => {
      const contract = next.contracts.find((c) => c.id === renewal.contractId);
      const calc = calcRenewalAmount(renewal, contract);
      return { ...renewal, ...calc };
    });
    next.customers = (next.customers || []).map((customer) => {
      return { ...customer, outstandingBalance: customerBalance(customer.id, next) };
    });
    syncAccounts(next);
    (next.contracts || []).forEach((c) => syncVehicleAvailability(next, c.vehicleId));
    return next;
  }

  function moduleOptions(section) {
    const store = window.PCR_STORE || W.PCR_DEFAULT_DATA;
    if (section === "customers") return (store.customers || []).map((c) => [c.id, `${c.fullName} (${c.customerId})`]);
    if (section === "vehicles") return (store.vehicles || []).map((v) => [v.id, `${v.vehicleNumber} — ${v.make} ${v.model}`]);
    if (section === "contracts") return (store.contracts || []).map((c) => [c.id, `${c.contractNumber} — ${resolveRelation("customers", c.customerId)}`]);
    if (section === "accounts") return (store.accounts || []).map((a) => [a.id, a.accountNumber]);
    return [];
  }

  W.PCR_MODULES = moduleConfigs;
  W.PCR_CALC = {
    calcRateAmount,
    calcRenewalAmount,
    syncAccounts,
    syncVehicleAvailability,
    ledgerEffect,
    customerBalance,
    resolveRelation,
    refreshDerivedData,
  };
  W.PCR.getModuleConfig = (page) => moduleConfigs[page] || moduleConfigs.settings;
  W.PCR.getDashboardSummary = getDashboardSummary;
  W.PCR.getRecent = getRecent;
  W.PCR.moduleOptions = moduleOptions;
})();
