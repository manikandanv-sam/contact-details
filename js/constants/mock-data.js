export const MOCK_API_RESPONSE = {
  success: true,
  response: {
    borrowerDetails: {
      name: "Ankit Sharma",
      mobile: "9123456780",
      email: "ankit.sharma@gmail.com",
      customerUrn: "0000000002001",
      address: "Delhi, India",
    },
    guarantorDetails: [
      {
        name: "Vikas Gupta",
        mobile: "9234567810",
        email: "vikas.gupta@gmail.com",
        customerUrn: "0000000003001",
        address: "Noida, Uttar Pradesh",
      },
      {
        name: "Amit Verma",
        mobile: "9345678120",
        email: "amit.verma@gmail.com",
        customerUrn: "0000000003002",
        address: "Ghaziabad, Uttar Pradesh",
      },
      {
        name: "Rajeev Singh",
        mobile: "9456781230",
        email: "rajeev.singh@gmail.com",
        customerUrn: "0000000003003",
        address: "Gurgaon, Haryana",
      },
    ],
  },
  message: "Customer communication details fetched successfully",
};
