/**
 * Mock Skyscanner Service for Research
 */

export interface FlightEstimate {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  carrier: string;
  duration: string;
}

export const skyscannerService = {
  async getFlightEstimates(destination: string): Promise<FlightEstimate[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockFlights: Record<string, FlightEstimate[]> = {
      "Paris": [
        { origin: "Dubai", destination: "Paris", price: 850, currency: "USD", carrier: "Emirates", duration: "7h 30m" },
        { origin: "London", destination: "Paris", price: 120, currency: "USD", carrier: "British Airways", duration: "1h 15m" }
      ],
      "Singapore": [
        { origin: "Dubai", destination: "Singapore", price: 650, currency: "USD", carrier: "Singapore Airlines", duration: "7h 15m" },
        { origin: "Kuala Lumpur", destination: "Singapore", price: 80, currency: "USD", carrier: "AirAsia", duration: "1h 0m" }
      ]
    };

    // Fallback for unknown destinations
    return mockFlights[destination] || [
      { origin: "Dubai", destination, price: 900, currency: "USD", carrier: "Global Air", duration: "Variable" }
    ];
  }
};
