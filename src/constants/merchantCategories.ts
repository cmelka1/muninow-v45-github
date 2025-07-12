export const MERCHANT_CATEGORIES = {
  "Utilities & Services": [
    "Water",
    "Sewer", 
    "Stormwater",
    "Trash / Solid Waste / Recycling",
    "Electric",
    "Natural Gas"
  ],
  "Property-Related": [
    "Property Taxes",
    "Special Assessments",
    "Lien Payments",
    "Permit Fees", 
    "Zoning & Planning Fees",
    "Code Violation Fines",
    "HOA Dues"
  ],
  "Vehicle & Transportation": [
    "Parking Tickets",
    "Parking Permits",
    "Vehicle Stickers",
    "Traffic Fines",
    "Toll or Bridge Fees"
  ],
  "Licensing & Registration": [
    "Business Licenses",
    "Pet Licenses",
    "Rental Property Registration",
    "Short-Term Rental Permits",
    "Solicitor Permits",
    "Liquor Licenses"
  ],
  "Administrative & Civic Fees": [
    "Public Records Requests (FOIA)",
    "Notary Services",
    "Document Certification",
    "Copy & Printing Fees"
  ],
  "Court & Legal": [
    "Court Fines",
    "Probation Fees",
    "Warrants / Bonds",
    "Restitution Payments",
    "Court Filing Fees"
  ],
  "Community Programs & Education": [
    "Recreation Program Fees",
    "Library Fines or Fees",
    "Facility Rentals"
  ],
  "Police / Fire / Emergency Services": [
    "False Alarm Fines",
    "Fire Inspection Fees",
    "Police Reports",
    "Fingerprinting / Background Checks"
  ],
  "Health & Sanitation": [
    "Health Permits",
    "Septic Tank Inspection Fees",
    "Food Safety Licenses"
  ],
  "Other Specialized Payments": [
    "Impact Fees",
    "Development Review Fees",
    "Tree Removal / Arborist Permits",
    "Cemetery Plot or Burial Fees",
    "Inspections",
    "Consulting"
  ],
  "Other": [
    "Other"
  ]
} as const;

export const CATEGORY_OPTIONS = Object.keys(MERCHANT_CATEGORIES);