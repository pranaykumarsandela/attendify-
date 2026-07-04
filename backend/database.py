from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import socket
import urllib.parse
import ssl
from dotenv import load_dotenv

load_dotenv()

# Changed to PostgreSQL connection for pgvector
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://fras_user:fras_password@127.0.0.1:5433/fras_db")

connect_args = {}
# Increase connection establishment timeout to 30 seconds to handle cold starts
connect_args["timeout"] = 30

if DATABASE_URL:
    # 1. Clean query parameters (strip sslmode=require)
    if "?" in DATABASE_URL:
        base_url, query = DATABASE_URL.split("?", 1)
        params = [p for p in query.split("&") if not p.startswith("sslmode=")]
        if params:
            DATABASE_URL = base_url + "?" + "&".join(params)
        else:
            DATABASE_URL = base_url

    # 2. Resolve hostname to IPv4 to bypass IPv6 routing issues on local networks
    parsed = urllib.parse.urlparse(DATABASE_URL)
    hostname = parsed.hostname
    if hostname and not hostname.replace('.', '').isdigit():
        try:
            ip_addresses = socket.getaddrinfo(hostname, parsed.port or 5432, family=socket.AF_INET)
            if ip_addresses:
                ipv4 = ip_addresses[0][4][0]
                # Replace hostname in netloc (handles username:password@host:port)
                netloc = parsed.netloc.replace(hostname, ipv4)
                DATABASE_URL = parsed._replace(netloc=netloc).geturl()
                
                # Pass Neon endpoint ID via server settings options to route direct IP connections
                if "neon.tech" in hostname or "neon.tech" in DATABASE_URL:
                    endpoint_id = hostname.split('.')[0]
                    connect_args["server_settings"] = {
                        "options": f"endpoint={endpoint_id}"
                    }
        except Exception:
            pass

    # 3. Enable SSL and bypass hostname validation if using Neon
    if "neon.tech" in os.getenv("DATABASE_URL", "") or "neon.tech" in DATABASE_URL or (hostname and "neon.tech" in hostname):
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300
)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
