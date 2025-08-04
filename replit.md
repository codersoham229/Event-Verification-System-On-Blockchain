# Blockchain Event Ticketing System

## Overview

This is a blockchain-based event ticketing and verification system built with Next.js (React), Express.js backend, and Ethereum smart contracts on the Sepolia testnet. The application allows users to create events, mint NFT tickets, and verify ticket authenticity using blockchain technology. It features a modern UI with shadcn/ui components, Web3 wallet integration, and QR code generation for seamless ticket management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components with Radix UI primitives and Tailwind CSS for styling
- **Routing**: Wouter for client-side routing with support for `/createevent`, `/generateticket`, and `/verifyevent` pages
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support

### Backend Architecture
- **Server**: Express.js with TypeScript serving both API routes and static assets
- **Development**: Vite dev server integration for hot module replacement in development
- **Storage**: In-memory storage interface with extensible CRUD operations for user management
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session store

### Blockchain Integration
- **Smart Contract Platform**: Ethereum Sepolia testnet for testing and development
- **Web3 Library**: ethers.js for blockchain interactions and wallet connectivity
- **Wallet Support**: MetaMask integration with automatic network switching to Sepolia
- **Contract Functions**: Event creation, ticket minting (NFTs), ticket verification, and usage tracking

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: User management with username/password authentication
- **Migrations**: Drizzle Kit for database schema migrations and management
- **Connection**: Neon Database serverless PostgreSQL with connection pooling

### Key Features
- **Event Management**: Create events with metadata stored on-chain and QR code generation
- **Ticket Minting**: NFT-based tickets linked to user wallets with attendee information
- **Verification System**: QR code scanning and blockchain verification of ticket authenticity
- **Wallet Integration**: Seamless Web3 wallet connection with balance display and network validation
- **Transaction Tracking**: Real-time transaction status monitoring with user feedback

### Security & Validation
- **Input Validation**: Zod schemas for runtime type checking and data validation
- **Form Handling**: React Hook Form with Zod resolvers for robust form validation
- **Smart Contract Security**: Event-based logging and proper access controls for ticket operations
- **Network Verification**: Automatic detection and switching to required Sepolia testnet

## External Dependencies

### Blockchain Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Ethereum Sepolia**: Testnet for smart contract deployment and testing
- **MetaMask**: Browser wallet for Web3 authentication and transaction signing

### Third-Party APIs
- **QR Server API**: External QR code generation service for ticket QR codes
- **Ethers.js**: Ethereum blockchain interaction library for Web3 functionality

### Development Tools
- **Vite**: Fast build tool with hot module replacement for development
- **Drizzle Kit**: Database schema management and migration tools
- **TypeScript**: Static type checking for enhanced code reliability
- **ESBuild**: Fast JavaScript bundler for production builds

### UI Components
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Lucide React**: Icon library for consistent iconography throughout the application
- **Embla Carousel**: Touch-friendly carousel component for enhanced UX