from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
import json
import os
from datetime import datetime, timedelta
import paramiko
import subprocess
import threading
import time
from collections import deque

# Try to import Oracle
try:
    import oracledb
    ORACLE_AVAILABLE = True
except ImportError:
    ORACLE_AVAILABLE = False
    print("⚠️  Oracle library not installed. Run: pip install oracledb")


app = Flask(__name__)
CORS(app)
sock = Sock(app)


# ============== ORACLE CONFIGURATION ==============
# EDIT THESE WITH YOUR ACTUAL ORACLE CREDENTIALS
ORACLE_CONFIG = {
    'user': os.getenv('ORACLE_USER', 'YOUR_USERNAME'),           # Replace YOUR_USERNAME
    'password': os.getenv('ORACLE_PASSWORD', 'YOUR_PASSWORD'),   # Replace YOUR_PASSWORD
    'dsn': os.getenv('ORACLE_DSN', 'HOST:PORT/SERVICE_NAME'),    # Replace HOST:PORT/SERVICE_NAME
}

# Global connection status
oracle_connection = None
connection_error = None

# ============== LOG ANALYSIS GLOBAL STATE ==============
# History here is primarily for real-time / recent monitoring via WebSocket.
# Per-day, full-range analysis data is returned directly in the log fetch
# response so it is not constrained by this history size.
rt_process_history = deque(maxlen=1000)  # Recent RT process readings for live dashboard
analysis_clients = set()  # WebSocket clients for analysis
alert_history = deque(maxlen=200)  # Store last 200 alerts for live dashboard
last_rt_count = 0
last_rt_timestamp = None
analysis_lock = threading.Lock()



def connect_oracle():
    """Establish Oracle connection - CALL THIS AFTER SETTING CREDENTIALS"""
    global oracle_connection, connection_error
    
    if not ORACLE_AVAILABLE:
        connection_error = "Oracle library not installed (pip install oracledb)"
        return False
    
    if not all([ORACLE_CONFIG['user'], ORACLE_CONFIG['password'], ORACLE_CONFIG['dsn']]):
        connection_error = "Oracle credentials not configured. Edit ORACLE_CONFIG in app.py"
        return False
    
    try:
        oracle_connection = oracledb.connect(
            user=ORACLE_CONFIG['user'],
            password=ORACLE_CONFIG['password'],
            dsn=ORACLE_CONFIG['dsn']
        )
        connection_error = None
        print("✅ Oracle connected successfully")
        return True
    except Exception as e:
        connection_error = str(e)
        print(f"❌ Oracle connection failed: {e}")
        return False



# ============== QUERIES SECTION - TO EDIT ==============



"""
ADD YOUR ORACLE QUERIES HERE
Current table assumptions (modify as per your schema):


Table: CALL_RECORDS
Columns: CALL_ID, CALLER_NUMBER, START_TIME, DURATION, STATUS, CALL_TYPE


Table: CALL_METRICS  
Columns: ACTIVE_CALLS, QUEUE_LENGTH, TOTAL_CALLS, TIMESTAMP
"""



def get_calls_query():
    """
    Modify this query according to your Oracle table structure
    Returns: SQL query string with :start_date and :end_date bind variables
    """
    query = """
        SELECT 
            CALL_ID,
            CALLER_NUMBER,
            TO_CHAR(START_TIME, 'YYYY-MM-DD HH24:MI:SS') as START_TIME,
            DURATION,
            STATUS,
            CALL_TYPE
        FROM CALL_RECORDS 
        WHERE START_TIME BETWEEN TO_DATE(:start_date, 'YYYY-MM-DD') 
                            AND TO_DATE(:end_date, 'YYYY-MM-DD') + 1
        ORDER BY START_TIME DESC
        FETCH FIRST 1000 ROWS ONLY
    """
    return query



def get_metrics_query():
    """
    Modify this query for real-time metrics
    """
    query = """
        SELECT 
            (SELECT COUNT(*) FROM CALL_RECORDS WHERE STATUS = 'ACTIVE') as ACTIVE_CALLS,
            (SELECT COUNT(*) FROM CALL_QUEUE WHERE STATUS = 'WAITING') as QUEUE_LENGTH,
            (SELECT COUNT(*) FROM CALL_RECORDS WHERE TRUNC(START_TIME) = TRUNC(SYSDATE)) as TOTAL_TODAY
        FROM DUAL
    """
    return query

# ============== API ENDPOINTS ==============

@app.route('/api/oracle/status', methods=['GET'])
def oracle_status():
    """Get Oracle connection status"""
    return jsonify({
        'connected': oracle_connection is not None,
        'library_available': ORACLE_AVAILABLE,
        'configured': all([ORACLE_CONFIG['user'], ORACLE_CONFIG['password'], ORACLE_CONFIG['dsn']]),
        'error': connection_error,
        'config': {
            'dsn': ORACLE_CONFIG['dsn'] if ORACLE_CONFIG['dsn'] else 'Not set',
            'user': ORACLE_CONFIG['user'] if ORACLE_CONFIG['user'] else 'Not set',
            'password_set': bool(ORACLE_CONFIG['password'])
        }
    })



@app.route('/api/oracle/connect', methods=['POST'])
def manual_connect():
    """Manually trigger Oracle connection attempt"""
    success = connect_oracle()
    return jsonify({
        'success': success,
        'error': connection_error
    })



@app.route('/api/calls/query', methods=['POST'])
def query_calls():
    """Fetch call records from Oracle"""
    if not oracle_connection:
        return jsonify({
            'success': False,
            'error': 'Oracle not connected',
            'oracle_status': 'disconnected',
            'message': 'Configure Oracle credentials and connect first'
        }), 503
    
    data = request.json
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    
    try:
        cursor = oracle_connection.cursor()
        query = get_calls_query()  # MENTOR: Edit this query above
        
        cursor.execute(query, {
            'start_date': start_date,
            'end_date': end_date
        })
        
        columns = [col[0] for col in cursor.description]
        records = []
        
        for row in cursor.fetchall():
            record = dict(zip(columns, row))
            records.append({
                'id': str(record.get('CALL_ID', '')),
                'callId': f"CALL-{record.get('CALL_ID', 'UNKNOWN')}",
                'callerNumber': str(record.get('CALLER_NUMBER', 'Unknown')),
                'startTime': record.get('START_TIME', ''),
                'duration': int(record.get('DURATION', 0)) if record.get('DURATION') else 0,
                'status': record.get('STATUS', 'UNKNOWN'),
                'type': record.get('CALL_TYPE', 'GENERAL')
            })
        
        cursor.close()
        
        return jsonify({
            'success': True,
            'total': len(records),
            'records': records,
            'source': 'Oracle Database',
            'dateRange': {'start': start_date, 'end': end_date}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Query failed. Check table names and columns.'
        }), 500



@app.route('/api/calls/metrics', methods=['GET'])
def get_metrics():
    """Get real-time metrics from Oracle"""
    if not oracle_connection:
        return jsonify({
            'success': False,
            'error': 'Oracle not connected',
            'oracle_status': 'disconnected'
        }), 503
    
    try:
        cursor = oracle_connection.cursor()
        query = get_metrics_query()  # MENTOR: Edit this query above
        
        cursor.execute(query)
        row = cursor.fetchone()
        
        if row:
            metrics = {
                'active': row[0] or 0,
                'queue': row[1] or 0,
                'completed': row[2] or 0,
                'cpu': 0,  # Not from Oracle
                'totalRecords': row[2] or 0
            }
        else:
            metrics = {'active': 0, 'queue': 0, 'completed': 0, 'cpu': 0, 'totalRecords': 0}
        
        cursor.close()
        
        return jsonify({
            'success': True,
            'metrics': metrics,
            'source': 'Oracle Database'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    



# log server 

@app.route('/api/logs/fetch-remote', methods=['POST'])
def fetch_remote_logs():
    """Fetch logs from remote server via SSH with date-wise folder structure"""
    data = request.json
    remote_config = data.get('remoteConfig', {})
    date_range = data.get('dateRange', '1day')

    # Support both the existing "customDate" field and a simpler "date" field:
    # {
    #   "date": "YYYY-MM-DD"
    # }
    custom_date = data.get('customDate', '') or data.get('date', '')
    
    # Validate config
    if not all([remote_config.get('ip'), remote_config.get('username')]):
        return jsonify({
            'success': False,
            'error': 'Remote server IP and username required'
        }), 400
    
    try:
        # Calculate dates to fetch
        dates_to_fetch = []
        base_path = remote_config.get('logPath', '/var/adm/syslog.dated')
        
        if custom_date:
            # Convert YYYY-MM-DD to DD-MM-YYYY for folder name
            date_obj = datetime.strptime(custom_date, '%Y-%m-%d')
            folder_name = date_obj.strftime('%d-%m-%Y')
            dates_to_fetch.append((custom_date, folder_name))
        else:
            # Calculate based on date range
            days = 1 if date_range == '1day' else 5
            end_date = datetime.now()
            
            for i in range(days):
                date_obj = end_date - timedelta(days=i)
                folder_name = date_obj.strftime('%d-%m-%Y')
                date_str = date_obj.strftime('%Y-%m-%d')
                dates_to_fetch.append((date_str, folder_name))
        
        logs = []
        all_process_data = []  # Store RT process timestamp data from logs for this request/day
        
        if remote_config.get('os') == 'linux':
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            connect_kwargs = {
                'hostname': remote_config['ip'],
                'username': remote_config['username'],
                'timeout': 30
            }
            
            if remote_config.get('password'):
                connect_kwargs['password'] = remote_config['password']
            
            ssh.connect(**connect_kwargs)
            
            # Fetch logs for each date
            for date_str, folder_name in dates_to_fetch:
                date_path = f"{base_path}/{folder_name}"
                
                # Check if directory exists and get all files
                stdin, stdout, stderr = ssh.exec_command(f"ls -la {date_path} 2>/dev/null | grep -E '^-' | awk '{{print $9}}'")
                files = stdout.read().decode('utf-8', errors='ignore').strip().split('\n')
                files = [f for f in files if f and f != '']
                
                if not files or files == ['']:
                    continue
                
                # Read all files in the date folder
                for file in files:
                    if not file:
                        continue
                    
                    file_path = f"{date_path}/{file}"
                    cmd = f"cat {file_path} 2>/dev/null || tail -n 10000 {file_path} 2>/dev/null"
                    
                    stdin, stdout, stderr = ssh.exec_command(cmd)
                    log_content = stdout.read().decode('utf-8', errors='ignore')
                    
                    if log_content:
                        parsed_logs = parse_log_content(log_content, remote_config['ip'], date_str)
                        logs.extend(parsed_logs)
                        
                        # Extract RT process timestamp data from log content
                        process_data = extract_rt_process_data(log_content, date_str)
                        all_process_data.extend(process_data)
            
            ssh.close()
            
            # Sort logs by timestamp for readability
            logs.sort(key=lambda x: x.get('timestamp', ''))
            
            # Analyze RT process gaps (millisecond differences between consecutive
            # process timestamps) and store both:
            # 1) In global history for live dashboards/WebSockets
            # 2) As a full-day processed dataset returned in this response
            per_request_analysis = analyze_rt_process_gaps(all_process_data)
            
        else:
            return jsonify({
                'success': False,
                'error': 'Windows RDP support not implemented. Use Linux SSH.'
            }), 501
        
        return jsonify({
            'success': True,
            'logs': logs,
            'source': remote_config['ip'],
            'path': base_path,
            'dates_fetched': [d[0] for d in dates_to_fetch],
            'count': len(logs),
            # Number of raw RT process timestamps extracted for this request
            'rt_process_data': len(all_process_data),
            # Full processed dataset (no artificial 5‑minute window, no 1000‑row limit)
            # Each item:
            #   {
            #     "timestamp": ISO datetime string,
            #     "timestampMs": epoch millis,
            #     "differenceMs": millis since previous process (or null),
            #     "isAlert": bool (True when differenceMs > 5 minutes),
            #   }
            'rt_process_analysis': per_request_analysis
        })
        
    except paramiko.AuthenticationException:
        return jsonify({
            'success': False,
            'error': 'SSH Authentication failed. Check username/password.'
        }), 401
        
    except paramiko.SSHException as e:
        return jsonify({
            'success': False,
            'error': f'SSH Connection failed: {str(e)}'
        }), 503
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def extract_rt_process_data(log_content, date_str):
    """Extract timestamp data from logs for RT process analysis"""
    import re
    process_data = []
    
    for line in log_content.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        # Try to extract timestamp from various formats (with or without milliseconds)
        timestamp = None
        
        # Examples:
        #   2026-02-25 09:56:56
        #   2026-02-25 09:56:56.123
        #   25-02-2026 09:56:56
        #   25-02-2026 09:56:56.123
        #   Feb 25 09:44:05
        #   09:44:05.123 (time only – we will attach date_str if available)
        patterns = [
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)',  # 2026-02-25 09:56:56[.mmm...]
            r'([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})',  # Feb 25 09:44:05
            r'(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)',  # 25-02-2026 09:56:56[.mmm...]
            r'(\d{2}:\d{2}:\d{2}\.\d{1,6})',  # 09:44:05.123 (time only, millisecond precision)
        ]
        
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                ts_str = match.group(1)
                try:
                    if '-' in ts_str and ' ' in ts_str and len(ts_str.split('-')[0]) == 4:
                        # 2026-02-25 format (with or without fractional seconds)
                        if '.' in ts_str:
                            dt = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                        else:
                            dt = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
                    elif '-' in ts_str and ' ' in ts_str:
                        # 25-02-2026 format (with or without fractional seconds)
                        if '.' in ts_str:
                            dt = datetime.strptime(ts_str, '%d-%m-%Y %H:%M:%S.%f')
                        else:
                            dt = datetime.strptime(ts_str, '%d-%m-%Y %H:%M:%S')
                    elif ':' in ts_str and '.' in ts_str and ' ' not in ts_str and date_str:
                        # Time-only with milliseconds, attach the provided date
                        dt = datetime.strptime(f"{date_str} {ts_str}", '%Y-%m-%d %H:%M:%S.%f')
                    else:
                        # Feb 25 format - use current year
                        current_year = datetime.now().year
                        dt = datetime.strptime(f"{current_year} {ts_str}", '%Y %b %d %H:%M:%S')
                    
                    timestamp = int(dt.timestamp() * 1000)  # Convert to milliseconds
                    break
                except:
                    continue
        
        if timestamp:
            process_data.append({
                'timestamp': timestamp,
                'timestamp_iso': datetime.fromtimestamp(timestamp / 1000).isoformat(),
                'line': line[:100]  # Store first 100 chars for reference
            })
    
    return process_data


# def analyze_rt_process_gaps(process_data):
#     """Analyze gaps between RT processes and store in global history.

#     Also returns a per-request, per-day dataset with millisecond differences
#     between consecutive process timestamps for frontend visualization.
#     """
#     global last_rt_timestamp, rt_process_history, alert_history
    
#     if not process_data:
#         return []
    
#     # Sort by timestamp
#     process_data.sort(key=lambda x: x['timestamp'])
    
#     per_request_points = []
    
#     with analysis_lock:
#         for i, data in enumerate(process_data):
#             current_ts = data['timestamp']
#             gap_ms = None
#             gap_minutes = None
            
#             if i > 0:
#                 prev_ts = process_data[i-1]['timestamp']
#                 gap_ms = current_ts - prev_ts
#                 gap_minutes = gap_ms / (1000 * 60)
            
#             data_point = {
#                 'timestamp': data['timestamp_iso'],
#                 'timestampMs': current_ts,
#                 'processCount': i + 1,
#                 # Keep minutes for existing dashboards,
#                 # but also expose raw millisecond differences.
#                 'gapMinutes': gap_minutes,
#                 'gapMs': gap_ms,
#                 'differenceMs': gap_ms,
#                 'serverId': 'log_server',
#                 'isAlert': bool(gap_ms is not None and gap_ms > 300000)  # > 5 minutes
#             }
            
#             rt_process_history.append(data_point)
#             per_request_points.append(data_point)
            
#             # Check for alert condition (> 5 minutes gap)
#             if gap_ms is not None and gap_ms > 300000:
#                 alert = {
#                     'id': str(current_ts),
#                     'timestamp': data['timestamp_iso'],
#                     'processCount': i + 1,
#                     'gapMinutes': gap_minutes,
#                     'gapMs': gap_ms,
#                     'severity': 'critical' if gap_ms > 600000 else 'warning'
#                 }
#                 alert_history.append(alert)
        
#         last_rt_timestamp = process_data[-1]['timestamp'] if process_data else None

#     return per_request_points

def analyze_rt_process_gaps(process_data):
    """
    Analyze gaps between consecutive process timestamps.
    Returns full-day processed dataset for frontend visualization.
    """
    global last_rt_timestamp, rt_process_history, alert_history

    if not process_data:
        return []

    # 1️⃣ Sort by timestamp
    process_data.sort(key=lambda x: x['timestamp'])

    per_request_points = []

    with analysis_lock:
        previous_ts = None

        for index, data in enumerate(process_data):
            current_ts = data['timestamp']
            gap_ms = None

            # 2️⃣ Calculate difference from previous record
            if previous_ts is not None:
                gap_ms = current_ts - previous_ts

            previous_ts = current_ts

            data_point = {
                "timestamp": data["timestamp_iso"],
                "timestampMs": current_ts,
                "processCount": index + 1,
                "differenceMs": gap_ms,
                "isAlert": True if gap_ms and gap_ms > 300000 else False
            }

            # Store for WebSocket history
            rt_process_history.append(data_point)
            per_request_points.append(data_point)

            # 3️⃣ Alert logic (> 5 min)
            if gap_ms and gap_ms > 300000:
                alert = {
                    "id": str(current_ts),
                    "timestamp": data["timestamp_iso"],
                    "processCount": index + 1,
                    "gapMs": gap_ms,
                    "gapMinutes": round(gap_ms / 60000, 2),
                    "severity": "critical" if gap_ms > 600000 else "warning"
                }
                alert_history.append(alert)

        last_rt_timestamp = process_data[-1]["timestamp"]

    return per_request_points


def parse_log_content(content, server_ip='unknown', date_str=None):
    """Parse log file content into structured format"""
    logs = []
    import re
    
    for line_num, line in enumerate(content.split('\n'), 1):
        line = line.strip()
        if not line:
            continue
            
        # Try multiple log formats
        
        # Format 1: 2024-02-18 09:30:15 [INFO] auth-service: User login
        match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+?): (.+)', line)
        if match:
            logs.append({
                'id': str(line_num),
                'timestamp': match.group(1),
                'level': match.group(2),
                'source': match.group(3),
                'message': match.group(4),
                'serverIp': server_ip
            })
            continue
            
        # Format 2: Feb 25 09:44:05 mccprodapp01 ...
        match = re.match(r'([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.+)', line)
        if match:
            ts_str = match.group(1)
            current_year = datetime.now().year
            try:
                full_ts = f"{current_year} {ts_str}"
                dt = datetime.strptime(full_ts, '%Y %b %d %H:%M:%S')
                timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                timestamp = date_str + ' ' + ts_str if date_str else ts_str
            
            logs.append({
                'id': str(line_num),
                'timestamp': timestamp,
                'level': 'INFO',
                'source': match.group(2),
                'message': match.group(3)[:200],
                'serverIp': server_ip
            })
            continue
            
        # Format 3: Simple delimited: timestamp|LEVEL|source|message
        parts = line.split('|')
        if len(parts) >= 4:
            logs.append({
                'id': str(line_num),
                'timestamp': parts[0],
                'level': parts[1],
                'source': parts[2],
                'message': '|'.join(parts[3:]),
                'serverIp': server_ip
            })
            continue
            
        # Format 4: Raw line with timestamp at start
        match = re.match(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})', line)
        if match:
            logs.append({
                'id': str(line_num),
                'timestamp': match.group(1),
                'level': 'INFO',
                'source': 'system',
                'message': line[20:][:200],
                'serverIp': server_ip
            })
            continue
            
        # Format 5: Raw line (fallback) - use provided date
        fallback_ts = f"{date_str} 00:00:00" if date_str else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        logs.append({
            'id': str(line_num),
            'timestamp': fallback_ts,
            'level': 'INFO',
            'source': 'raw',
            'message': line[:200],
            'serverIp': server_ip
        })
    
    return logs


# ============== LOG ANALYSIS API ENDPOINTS ==============

@app.route('/api/logs/analysis/<server_id>', methods=['GET'])
def get_log_analysis(server_id):
    """Get current analysis data via HTTP polling"""
    with analysis_lock:
        history_list = list(rt_process_history)
        alerts_list = list(alert_history)
        
        total_alerts = len(alerts_list)
        peak_logs = max([d['processCount'] for d in history_list]) if history_list else 0
        
        alert_level = 'Normal'
        if alerts_list:
            latest_alert = alerts_list[-1]
            if latest_alert['gapMinutes'] > 10:
                alert_level = 'Critical'
            else:
                alert_level = 'Warning'
    
    return jsonify({
        'success': True,
        'serverId': server_id,
        'history': history_list,
        'alerts': alerts_list,
        'stats': {
            'totalProcesses': len(history_list),
            'peakLogs': peak_logs,
            'alertDuration': f"{total_alerts}m" if total_alerts > 0 else '0m',
            'totalAlertLogs': total_alerts,
            'alertLevel': alert_level
        }
    })



# ============== WEBSOCKET ENDPOINTS ==============


@sock.route('/ws/logs/<server_id>')
def logs_websocket(ws, server_id):
    """WebSocket for log server real-time updates"""
    
    ws.send(json.dumps({
        'type': 'status',
        'message': 'Log Server WebSocket Connected'
    }))
    
    try:
        while True:
            message = ws.receive()
            if message is None:
                break
            
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'fetch_complete':
                ws.send(json.dumps({
                    'response': f"✅ Successfully fetched {data.get('count', 0)} logs from {data.get('server', 'remote server')}",
                    'isRealTime': True,
                    'dataSource': 'Remote SSH'
                }))
            
            elif msg_type == 'query':
                ws.send(json.dumps({
                    'response': 'I can help analyze your remote logs. Ask me about errors, patterns, or specific time ranges.',
                    'dataSource': 'Log AI'
                }))
                
    except Exception as e:
        print(f"Log WebSocket error: {e}")


@sock.route('/ws/logs/analysis/<server_id>')
def logs_analysis_websocket(ws, server_id):
    """WebSocket for real-time log analysis (RT processes)"""
    
    # Add client to broadcast set
    analysis_clients.add(ws)
    
    try:
        # Send initial data
        with analysis_lock:
            history_list = list(rt_process_history)
            alerts_list = list(alert_history)
            
            # Calculate stats
            total_alerts = len(alerts_list)
            peak_logs = max([d['processCount'] for d in history_list]) if history_list else 0
            
            # Determine alert level
            alert_level = 'Normal'
            if alerts_list:
                latest_alert = alerts_list[-1]
                if latest_alert['gapMinutes'] > 10:
                    alert_level = 'Critical'
                else:
                    alert_level = 'Warning'
        
        ws.send(json.dumps({
            'type': 'analysis_data',
            'history': history_list,
            'alerts': alerts_list,
            'stats': {
                'totalProcesses': len(history_list),
                'peakLogs': peak_logs,
                'alertDuration': f"{total_alerts}m" if total_alerts > 0 else '0m',
                'totalAlertLogs': total_alerts,
                'alertLevel': alert_level
            }
        }))
        
        # Keep connection alive and handle client messages
        while True:
            message = ws.receive()
            if message is None:
                break
            
            data = json.loads(message)
            
            if data.get('type') == 'get_analysis':
                # Resend analysis data
                with analysis_lock:
                    history_list = list(rt_process_history)
                    alerts_list = list(alert_history)
                    
                    total_alerts = len(alerts_list)
                    peak_logs = max([d['processCount'] for d in history_list]) if history_list else 0
                    
                    alert_level = 'Normal'
                    if alerts_list:
                        latest_alert = alerts_list[-1]
                        if latest_alert['gapMinutes'] > 10:
                            alert_level = 'Critical'
                        else:
                            alert_level = 'Warning'
                
                ws.send(json.dumps({
                    'type': 'analysis_data',
                    'history': history_list,
                    'alerts': alerts_list,
                    'stats': {
                        'totalProcesses': len(history_list),
                        'peakLogs': peak_logs,
                        'alertDuration': f"{total_alerts}m" if total_alerts > 0 else '0m',
                        'totalAlertLogs': total_alerts,
                        'alertLevel': alert_level
                    }
                }))
                
    except Exception as e:
        print(f"Analysis WebSocket error: {e}")
    finally:
        analysis_clients.discard(ws)

# ============== RUN ==============

if __name__ == '__main__':
    print("=" * 50)
    print("ADMS Oracle Backend")
    print("=" * 50)
    print(f"Oracle Library: {'✅ Available' if ORACLE_AVAILABLE else '❌ Not installed'}")
    print(f"Credentials Set: {'✅ Yes' if all([ORACLE_CONFIG['user'], ORACLE_CONFIG['password'], ORACLE_CONFIG['dsn']]) else '❌ No'}")
    print("\nTo connect Oracle:")
    print("1. Edit ORACLE_CONFIG in this file with your credentials")
    print("2. Or set environment variables: ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN")
    print("3. Call POST /api/oracle/connect or restart server")
    print("=" * 50)
    print("Log Analysis: RT Process monitoring started")
    print("WebSocket endpoints:")
    print("  - /ws/logs/<server_id> (existing log server)")
    print("  - /ws/logs/analysis/<server_id> (new analysis)")
    print("=" * 50)
    
    # Try auto-connect if credentials are set
    if all([ORACLE_CONFIG['user'], ORACLE_CONFIG['password'], ORACLE_CONFIG['dsn']]):
        connect_oracle()
    
    app.run(host='0.0.0.0', port=5001, debug=True)
