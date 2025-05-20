# Inanna 

A Structured Starting Point for Frontend Applications.

---

##  What is Inanna?

**Inanna** is an open-source starter template designed to streamline the creation of structured, maintainable, and scalable frontend applications. Leveraging modern best practices, Inanna provides a robust foundational framework that developers can easily customize to kickstart their projects.

###  Core Technologies

- **React** with **TypeScript**
- **Vite** for fast and efficient builds
- **Material UI (MUI)** for consistent and configurable UI components
- **MapLibre** for interactive map functionalities

---

## Features

- **Configurable Theming:**  
  Customize your application's look and feel dynamically via a simple configuration file—perfect for branding, logos, and color schemes.

- **Responsive Layout:**  
  Ensures your application maintains aesthetic appeal across desktop and mobile devices.

- **State Management:**  
  Integrates modern state management techniques (React Context, optional Redux) for efficient application state handling.

- **Interactive Maps:**  
  Pre-configured interactive mapping components powered by MapLibre, excellent for building location-based applications.

---

## How to Use Inanna in Your Project

### Getting Started

1. **Clone the repository:**
   ```
   git clone https://github.com/entur/inanna.git
2. **Install dependencies:**
   ```
   npm install
3. **Run the development server::**
   ```
   npm run dev
## Customizing the Project

**Update Theme Configuration:**
Modify/create custom-theme-config.json to quickly adjust colors, logos, and typography. For an overview of the things you can change to the MUI theme have a look here: https://mui.com/material-ui/customization/default-theme/

**Add New Pages and Components:**
Follow provided examples (Home.tsx, MapView.tsx) to create your own pages. Components are neatly organized in the components/ directory.

**Customize the Map:**
Adjust the map view via mapStyle.ts, or add layers and interactivity directly.

**Bring your own icons:**
Don't want to use the default icons under /icons folder? No problem, just add your own icon with the same name in the /customIcons folder then you have your own icons. **TODO - not done yet**