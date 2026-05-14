/**
 * Mock service for TravelPerk API integration.
 * In a production environment, this would call real TravelPerk endpoints.
 * Requires TRAVELPERK_API_KEY environment variable.
 */

export interface TravelOption {
  id: string;
  type: 'flight' | 'hotel';
  provider: string;
  description: string;
  price: number;
  currency: string;
  rating?: number;
}

export const travelPerkService = {
  async searchFlights(origin: string, destination: string, date: string): Promise<TravelOption[]> {
    console.log(`Searching flights from ${origin} to ${destination} on ${date}`);
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return [
      {
        id: 'fl-101',
        type: 'flight',
        provider: 'Emirates',
        description: `Direct flight from ${origin} to ${destination}`,
        price: 850,
        currency: 'USD'
      },
      {
        id: 'fl-102',
        type: 'flight',
        provider: 'Qatar Airways',
        description: `Layoever in Doha, high comfort`,
        price: 720,
        currency: 'USD'
      }
    ];
  },

  async searchHotels(city: string, checkIn: string, checkOut: string): Promise<TravelOption[]> {
    console.log(`Searching hotels in ${city} from ${checkIn} to ${checkOut}`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    return [
      {
        id: 'ht-501',
        type: 'hotel',
        provider: 'Hilton Garden Inn',
        description: 'Prime location, near conference centers.',
        price: 180,
        currency: 'USD',
        rating: 4.5
      },
      {
        id: 'ht-502',
        type: 'hotel',
        provider: 'Marriott Executive Apartments',
        description: 'Ideal for long stays and larger teams.',
        price: 240,
        currency: 'USD',
        rating: 4.8
      }
    ];
  }
};
