# Oracle Database Setup

## 1. Install Oracle Client
- Download Oracle Instant Client (Basic or Basic Light)
- Add to system PATH
- Or set: `oracledb.init_oracle_client(lib_dir=r"path\to\instantclient")`

## 2. Configure Credentials
Edit `app.py` ORACLE_CONFIG:
```python
ORACLE_CONFIG = {
    'user': 'your_username',
    'password': 'your_password', 
    'dsn': 'hostname:1521/service_name'
}
