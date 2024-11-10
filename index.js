const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = ['http://localhost:3000', 'https://baraalive.onrender.com'];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

// Enable CORS for the frontend
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.use(express.json());

// Sample data for users and orders
let users = [
  { id: 1, name: 'محمد رمضان' },
  { id: 2, name: 'رجاء' },
  { id: 3, name: 'احمد فيصل' },
  { id: 4, name: 'عمر فيصل' },
  { id: 5, name: 'توفيق' },
  { id: 6, name: 'هديل' },
  { id: 7, name: 'اسراء' },
  { id: 8, name: 'شهد' },
  { id: 9, name: 'ليندا' },
  { id: 10, name: 'انس' },
  { id: 11, name: 'سليمان' },
  { id: 12, name: 'جنيدي' },
  { id: 13, name: 'امير' },
  { id: 14, name: 'سيف' },
  { id: 15, name: 'عايد' },
  { id: 16, name: 'عواد' },
  { id: 17, name: 'ابؤاهيم' },
  { id: 18, name: 'نضال' },
  { id: 19, name: 'مصطفا' },
  { id: 20, name: 'عكور' },
  { id: 21, name: 'عدنان' },
  { id: 22, name: 'محمد' },
  { id: 23, name: 'مجهول' },
];

let allOrders = [];

// Sample items (you can replace this with a real database or data source)
let items = [
  { id: 1, name: ' نسكافيه (Nescafe)' },
  { id: 2, name: 'شاي  (Tea)' },
  { id: 3, name: 'قهوة عربية (Arabic Coffee)' },
  { id: 4, name: 'قهوة تركية (Turkish Coffee)' },
  { id: 5, name: 'قهوة إسبرسو (Espresso)' },
  { id: 6, name: 'قهوة لاتيه (Latte)' },
  { id: 7, name: 'قهوة موكا (Mocha)' },
  { id: 8, name: 'قهوة كابتشينو (Cappuccino)' },
  { id: 9, name: 'قهوة فرابوتشينو (Frappuccino)' },
];

// API Routes
app.use(express.static(path.join(__dirname, 'client/build')));

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Get orders for a specific user
app.get('/api/orders/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userOrders = allOrders.filter(order => order.userId === userId);
  res.json(userOrders);
});

// Get all orders
app.get('/api/orders', (req, res) => {
  res.json(allOrders);
});

// Get all available items (new endpoint)
app.get('/api/items', (req, res) => {
  res.json(items); // This returns the items to the frontend
});

// Add or update an order
app.post('/api/order', (req, res) => {
  const { id, userId, item, quantity } = req.body;
  const timestamp = new Date().toISOString(); // Add timestamp here

  if (id) {
    // Update existing order
    const orderIndex = allOrders.findIndex(order => order.id === id);
    if (orderIndex >= 0) {
      allOrders[orderIndex] = { id, userId, item, quantity, timestamp }; // Add timestamp on update
    }
  } else {
    // Add new order
    const newOrder = { id: allOrders.length + 1, userId, item, quantity, timestamp }; // Add timestamp on create
    allOrders.push(newOrder);
  }

  // Emit the updated orders list to all connected clients via WebSocket
  io.emit('order-updated', allOrders);

  res.status(200).json(allOrders);
});

// Delete all orders
app.delete('/api/orders', (req, res) => {
  allOrders = []; // Clear all orders

  // Emit the updated orders to all connected clients via WebSocket
  io.emit('order-updated', allOrders);

  res.status(200).json({ message: 'All orders have been deleted' });
});

// Delete a specific order
app.delete('/api/order/:orderId', (req, res) => {
  const { orderId } = req.params;
  allOrders = allOrders.filter(order => order.id !== parseInt(orderId));

  // Emit the updated orders list to all connected clients via WebSocket
  io.emit('order-updated', allOrders);

  res.status(200).json(allOrders);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  // Send current orders to the new client
  socket.emit('order-updated', allOrders);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
