# ADMS Network Monitoring System

A modern **full-stack monitoring and analytics platform** designed for Advanced Distribution Management System (ADMS) infrastructure used in power distribution networks.

The platform enables **real-time monitoring, system health visualization, and operational analysis** for utility and IT teams responsible for managing critical infrastructure. It integrates live call server data from **Oracle databases** and log activity from **Linux-based servers** to provide centralized visibility into system performance.

The application provides **interactive dashboards, log monitoring, call server analytics, and infrastructure insights** through a responsive web interface built with modern web technologies. By combining real-time data processing with visual analytics, the system helps teams quickly detect anomalies, monitor operational trends, and maintain the reliability of ADMS network components.

---

## Features

### Interactive Dashboard
Visualizes the status of multiple ADMS subsystems including management, operational, and physical infrastructure components.

### Log Server Monitoring
Displays real-time log server activity from Linux systems. Logs are processed and analyzed to detect errors, warnings, and abnormal activity patterns.

### Call Server Analytics
Fetches and analyzes real-time call server data from **Oracle database queries** through the backend API.

### Automated Log Analysis
Uploaded or streamed logs are automatically parsed to extract:

- Error rates
- System warnings
- Activity peaks
- Server health indicators

### System Health Overview
Provides a consolidated view of:

- Active systems
- Legacy infrastructure
- New system deployments
- Migration progress

### Modern Responsive UI
Built with **Next.js, React, TypeScript, and Tailwind CSS**.

---

## Architecture
```
Frontend (Next.js + TypeScript + Tailwind)
↓
Flask Backend API
↓
Oracle Database
↓
Linux Log Servers
```

## Project Structure
```
ADMS-Network-Monitoring-System/
app/                # Next.js application routes and pages
components/         # Reusable React UI components
hooks/              # Custom React hooks
lib/                # Utility functions and helpers
public/             # Static assets (icons, images)
backend/
  app.py            # Flask backend server
  requirements.txt  # Python dependencies
  ORACLE_SETUP.md   # Oracle configuration guide
next.config.js
tailwind.config.ts
tsconfig.json
package.json
```
---
## Setup & Installation
### Prerequisites
#### Make sure the following are installed:
```
Node.js (v18+ recommended)
Python 3.8+
pip (Python package manager)
Oracle Database access
Linux server access (for log monitoring)
```
## 1. Backend Setup
```
cd backend
pip install -r requirements.txt
python app.py
```
Backend server will start at: 
http://localhost:5001

## 2. Frontend Setup
```
npm install
npm run dev
```
Frontend will start at: 
http://localhost:3000

## 3. Oracle Configuration
```
Update Oracle database connection in: backend/app.py

Configure the following parameters:
ORACLE_HOST
ORACLE_PORT
ORACLE_SERVICE_NAME
ORACLE_USERNAME
ORACLE_PASSWORD
```
This configuration enables real-time call server data fetching for the dashboard.

## 4. Linux Log Server Configuration
```
Log server monitoring is configured in: app/server/[id]/logs-upload/page.tsx

Provide Linux server details such as:
SERVER_IP
LOG_DIRECTORY
SERVER_USERNAME
ACCESS_METHOD (SSH / API)
```
Logs from the Linux server are processed to display:
- real-time log activity
- system warnings
- abnormal processes
---
## Usage
### Access Dashboard
Open the dashboard: http://localhost:3000
### Monitor System Infrastructure
View health status of:
- Management systems
- Operational systems
- Physical infrastructure

### Monitor Call Server Data
Real-time call server metrics are fetched from the Oracle backend API.

### Monitor Log Servers
Linux server logs are analyzed and displayed with:
- Error detection
- Warning alerts
- Activity peaks
---
## Technologies Used

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS  
- **Backend:** Python, Flask  
- **Database:** Oracle Database  
- **Server Infrastructure:** Linux Servers  
- **Communication:** WebSocket, SSH  
- **APIs:** APIs for log monitoring and call server analytics
---
## License
- This project is licensed under the MIT License.
---
## Acknowledgements
- Developed as part of an internship project for ADMS network monitoring and system analysis.
- Inspired by real-world power distribution and utility infrastructure monitoring systems.
- Built using open-source technologies including Next.js, React, Python, and Flask.
