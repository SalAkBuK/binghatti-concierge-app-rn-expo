# Tower Desk - Binghatti Concierge App

> A comprehensive multi-role property management and concierge platform built with React Native and Expo

[![Expo](https://img.shields.io/badge/Expo-~54.0-000020.svg?style=flat-square&logo=EXPO&labelColor=000&logoColor=FFF)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-Latest-61DAFB.svg?style=flat-square&logo=react&logoColor=white)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## 📋 Overview

Tower Desk is a feature-rich mobile application designed to streamline property management, maintenance requests, tenant services, and building operations. The platform supports six distinct user roles, each with specialized features and workflows.

### Key Features

- 🏢 **Multi-Building Management** - Manage multiple properties from a single platform
- 👥 **Six User Roles** - Admin, Management, Tenant, Employee, Service Provider, Building Employee
- 🎫 **Service Request System** - Track maintenance and service requests with real-time status updates
- 📊 **Analytics Dashboard** - Comprehensive KPIs and performance metrics
- 🔔 **Real-time Notifications** - Push notifications for important updates
- 📁 **Document Management** - Upload and manage documents with Cloudinary integration
- 🌙 **Dark Mode Support** - Automatic theme switching based on user preference

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** or **yarn**
- **Expo CLI** (installed automatically)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/SalAkBuK/binghatti-concierge-app-rn-expo.git
cd binghatti-concierge-app-rn-expo
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
# Copy the example env file and fill in your credentials
cp .env.example .env.local
```

4. Start the development server:

```bash
npm start
```

### Development Commands

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm start`         | Start the Metro bundler           |
| `npm run android`   | Launch on Android emulator/device |
| `npm run ios`       | Launch on iOS simulator/device    |
| `npm run web`       | Launch web version                |
| `npm run lint`      | Run ESLint                        |
| `npm test`          | Run Jest tests                    |
| `npm run typecheck` | Run TypeScript type checking      |

## 📱 User Roles

### 1. 👑 Super Admin

- System-wide administration and oversight
- Portfolio analytics and KPIs
- User management across all roles
- Building creation and configuration
- Permission management

### 2. 🏢 Management

- Building-specific administration
- Tenant and employee management
- Service request oversight
- Building analytics and reporting
- Vendor management

### 3. 🏠 Tenant

- Submit and track service requests
- View building announcements
- Access building amenities
- Manage profile and documents
- Payment history

### 4. 🔧 Employee (Maintenance Staff)

- View assigned service requests
- Update job status and progress
- Upload completion photos
- Track work history
- Building assignments

### 5. 👷 Service Provider

- Manage assigned jobs
- Track service requests
- Update job progress
- Submit invoices
- Performance metrics

### 6. 🏗️ Building Employee

- Front desk operations
- Tenant assistance
- Building access management
- Daily operations logging

## 🏗️ Project Structure

```
binghatti-concierge-app-rn-expo/
├── app/                      # Expo Router navigation
│   ├── (admin)/             # Admin role screens
│   ├── (management)/        # Management role screens
│   ├── (tenant)/            # Tenant role screens
│   ├── (employee)/          # Employee role screens
│   ├── (serviceProvider)/   # Service Provider screens
│   └── (buildingEmployee)/  # Building Employee screens
├── src/
│   ├── screens/             # Screen components
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Shared components
│   │   ├── admin/          # Admin-specific components
│   │   ├── management/     # Management components
│   │   └── ui/             # Base UI elements
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services and utilities
│   └── types/              # TypeScript type definitions
├── assets/                  # Images, fonts, and static files
├── constants/              # App-wide constants and themes
├── features/               # Feature documentation
└── APIs/                   # API documentation
```

## 🔧 Tech Stack

### Core

- **React Native** - Mobile app framework
- **Expo SDK ~54** - Development platform
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation

### State Management & Data

- **React Context API** - Global state management
- **Axios** - HTTP client
- **AsyncStorage** - Local data persistence

### UI Components

- **React Native Elements** - UI component library
- **React Native Paper** - Material Design components
- **Expo Vector Icons** - Icon library
- **Lottie** - Animations

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **React Native Testing Library** - Component testing

### Cloud Services

- **Cloudinary** - Image and document storage
- **Expo Application Services (EAS)** - Build and deployment

## 🛠️ Building for Production

### Android APK (Local Build)

```bash
npm run build:local
```

### EAS Build (Cloud)

```bash
# Preview build
npm run build:preview

# Production build
npm run build:production
```

For detailed build instructions, see [BUILD_SHAREABLE_APK.md](./BUILD_SHAREABLE_APK.md) and [FAST_BUILD_GUIDE.md](./FAST_BUILD_GUIDE.md).

## 📚 Documentation

- **[Features](./features/README.md)** - Detailed feature documentation by role
- **[API Documentation](./APIs/)** - Backend API specifications
- **[Agents Guide](./AGENTS.md)** - Repository guidelines and conventions
- **[Cloudinary Setup](./CLOUDINARY_SETUP.md)** - File upload configuration
- **[Performance Optimization](./FRONTEND_PERFORMANCE_OPTIMIZATION.md)** - Performance best practices

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Coverage target: **80%** for new screens and features.

## 📝 Code Style

This project follows:

- **Prettier** defaults (2-space indentation, single quotes)
- **TypeScript strict mode**
- **Conventional Commits** (`feat:`, `fix:`, `chore:`)
- **Named exports** for better tree shaking

Lint before committing:

```bash
npm run lint
```

## 🔒 Environment Variables

Create a `.env.local` file with the following variables:

```env
API_BASE_URL=https://your-api-url.com
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

See [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) for test account details.

## 🤝 Contributing

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feat/amazing-feature`)
3. **Commit** your changes using Conventional Commits
4. **Push** to the branch (`git push origin feat/amazing-feature`)
5. Open a **Pull Request**

### Pull Request Guidelines

- Concise summary with linked ticket (Linear/Jira)
- Passing lint and tests
- UI proof (screenshot/video) for user-facing changes
- Documentation updates if needed

## 📄 License

This project is proprietary and confidential.

## 👥 Team

Developed by **CodeFier** for Binghatti Properties

## 📞 Support

For issues and questions, please open an issue in the repository or contact the development team.

---

**Last Updated:** December 26, 2025
