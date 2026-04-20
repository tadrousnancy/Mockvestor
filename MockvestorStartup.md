# Mockvestor - Local Showcase Start-Up Guide

Follow these steps to configure and run the Mockvestor application locally. 

*Note: This automated setup is designed for Windows environments and requires Python 3.13.5 to be installed on your machine.*

## 1. Project Initialization
1. Download the repository zip file from the `ml-integration` branch.
2. Extract the zip file to your desired local directory.

## 2. Configuration (Pre-Flight Check)
Before launching the application, you must configure the secure keys and local network routing.

1. **Backend Keys:** Copy the provided `.env` file and paste it exactly into the `./server/src/core/.` directory.
2. **Find your IP Address:** Your computer will act as the local backend server. Open a terminal (PowerShell or Command Prompt) and run:
   ```powershell
   ipconfig
   ```
3. **Frontend Routing:** Open your preferred code editor and navigate to `./mobile/config.ts`. Replace `YOUR_LOCAL_IP` in the `BASE_API_URL` variable with your actual IPv4 address and save the file.

## 3. Launch the Application
Navigate to the root directory of the extracted project.

1. Locate the `start-mockvestor.bat` file.
2. **Double-click** the file to initiate the automated launch sequence.

*The script will automatically create a Python virtual environment, install all required backend and frontend dependencies, and open two new terminal windows running the FastAPI backend and Expo frontend.

## 4. Run Mockvestor
Once the installation finished and the Expo server finished loading in the mobile terminal, it will generate a QR code.
**Scan this QR code** using your device's camera (iOS) or the Expo Go app (Android) to launch the Mockvestor application!