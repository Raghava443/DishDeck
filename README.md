# DishDeck - Premium Restaurant & Event Booking Platform

**DishDeck** is a full-featured restaurant, event room, and online food ordering platform built with Electron and Node.js. It provides a seamless and immersive digital experience for discovering, booking, and enjoying premium dining services.

## Features

### 🍽️ Restaurant & Event Booking
- **Multi-Location Booking**: Book tables or event rooms at any of our premium locations.
- **Event Management**: Reserve dedicated event rooms for parties, meetings, and special occasions.
- **Real-Time Availability**: Check available slots for tables and event rooms.
- **Flexible Payments**: Supports Card, UPI, and Cash on Delivery (COD).
- **Booking Management**: Users can view, manage, and cancel their bookings.
- **Admin Dashboard**: Complete backend management for bookings, menu items, and users.

### 🛍️ Online Food Ordering
- **Curated Menu**: Browse a premium selection of appetizers, main courses, beverages, and desserts.
- **Real-Time Pricing**: Menu prices update dynamically from the database.
- **Secure Checkout**: Integrated Stripe payment gateway for online orders.
- **Order Tracking**: Track your order status from preparation to delivery.
- **Order History**: View past orders and easily reorder favorites.

### 📊 Admin Panel
- **Comprehensive Dashboard**: Real-time overview of bookings, orders, revenue, and system metrics.
- **Booking Management**: Review and manage all table and event room bookings.
- **User Management**: View and manage registered users.
- **Menu Customization**: Add, edit, or remove menu items with images and prices.
- **Order Management**: Process and update the status of online food orders.
- **Revenue Analytics**: Detailed insights into daily, weekly, and monthly earnings.

## Tech Stack

### Frontend
- **Electron**: Desktop application framework (Main Process & Renderer Process).
- **Plain HTML/CSS/JS**: Custom styling and client-side logic.

### Backend
- **Node.js**: Server-side runtime.
- **Express**: Web framework.
- **SQLite3**: Database management.

### Payments & Services
- **Stripe**: Secure payment processing for online orders.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd Restaurant Booking
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

### Usage

1.  **Start the backend server**:
    ```bash
    node server.js
    ```
    The server will start and provision an admin user if not already present.

2.  **Launch the application**:
    ```bash
    npm start
    ```
    The Electron application will open, providing access to the restaurant and event booking platform.

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Database

The application uses an SQLite database file named `restaurant_booking.db` in the root directory. This database stores:
- User accounts
- Menu items
- Table bookings
- Event room bookings
- Online orders
- Payments and transactions

