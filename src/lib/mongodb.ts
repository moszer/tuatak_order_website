import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pattaraponprakodchue_db_user:7cx0SlMLe7j5KLYc@cluster0.dthqnvf.mongodb.net/tuatak_shabunt?retryWrites=true&w=majority&appName=Cluster0';

if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('tuatak_shabunt');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

export interface Order {
    _id?: string;
    tableNumber: string;
    items: {
        id: number;
        name: string;
        nameTh: string;
        price: number;
        quantity: number;
        comment?: string;
    }[];
    totalPrice: number;
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid';
    createdAt: Date;
    updatedAt: Date;
}
