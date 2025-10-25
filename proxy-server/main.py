"""
Proxy Server for Envio HyperIndex API
Fetches latest cryptocurrency prices using Envio's HyperIndex by querying DEX data
Indexes on-chain swap events from Uniswap, Sushiswap, etc. to get real-time prices
Allows ICP chain applications to communicate and fetch BTC, ETH, ICP, and PLT prices
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
env_vars_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_vars_path)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Envio HyperIndex GraphQL endpoint
ENVIO_GRAPHQL_URL = os.getenv("ENVIO_GRAPHQL_URL", "https://indexer.bigdevenergy.link/a936a93/v1/graphql")
ENVIO_API_TOKEN = os.getenv("ENVIO_API_TOKEN")

# Token addresses for price tracking (Ethereum mainnet examples)
TOKEN_ADDRESSES = {
    "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # Wrapped ETH
    "WBTC": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",  # Wrapped BTC
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC stablecoin
    "ICP": "0x...",  # ICP token address (if available on Ethereum)
}

# CoinGecko API as fallback/complement
COINGECKO_API_BASE = "https://api.coingecko.com/api/v3"

# Cryptocurrency mapping
CRYPTO_IDS = {
    "BTC": {"coingecko": "bitcoin", "symbol": "BTC", "token": "WBTC"},
    "ETH": {"coingecko": "ethereum", "symbol": "ETH", "token": "WETH"},
    "ICP": {"coingecko": "internet-computer", "symbol": "ICP", "token": "ICP"},
    "PLT": {"coingecko": "concordium", "symbol": "PLT", "token": "PLT"}
}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "service": "envio-hyperindex-proxy",
        "timestamp": datetime.utcnow().isoformat(),
        "supported_currencies": list(CRYPTO_IDS.keys())
    }), 200


@app.route('/prices', methods=['GET'])
def get_prices():
    """
    Get latest prices for BTC, ETH, ICP, and PLT
    Uses Envio HyperIndex for on-chain DEX data, falls back to CoinGecko
    Query params:
        - currencies: comma-separated list (e.g., BTC,ETH,ICP,PLT)
        - fiat: target fiat currency (default: USD)
        - source: 'hyperindex' or 'coingecko' (default: auto)
    """
    try:
        # Get requested currencies from query params
        currencies_param = request.args.get('currencies', 'BTC,ETH,ICP,PLT')
        fiat = request.args.get('fiat', 'USD').lower()
        source = request.args.get('source', 'auto')
        
        # Parse currencies
        requested_currencies = [c.strip().upper() for c in currencies_param.split(',')]
        
        # Validate currencies
        valid_currencies = [c for c in requested_currencies if c in CRYPTO_IDS]
        
        if not valid_currencies:
            return jsonify({
                "error": "Invalid currencies",
                "message": f"Supported currencies: {', '.join(CRYPTO_IDS.keys())}"
            }), 400
        
        # Try HyperIndex first if token is configured and source allows
        prices = None
        data_source = "unknown"
        
        if ENVIO_API_TOKEN and source in ['auto', 'hyperindex']:
            try:
                print("🔍 Attempting to fetch prices from Envio HyperIndex...")
                prices = fetch_prices_from_hyperindex(valid_currencies, fiat)
                data_source = "envio-hyperindex"
                print("✅ Successfully fetched from HyperIndex")
            except Exception as e:
                print(f"⚠️  HyperIndex failed: {str(e)}, falling back to CoinGecko")
                prices = None
        
        # Fallback to CoinGecko if HyperIndex failed or not configured
        if prices is None:
            print("🔍 Fetching prices from CoinGecko...")
            prices = fetch_prices_from_coingecko(valid_currencies, fiat)
            data_source = "coingecko"
        
        return jsonify({
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "fiat": fiat.upper(),
            "prices": prices,
            "source": data_source
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": "Failed to fetch prices",
            "message": str(e)
        }), 500


@app.route('/price/<currency>', methods=['GET'])
def get_single_price(currency):
    """
    Get latest price for a single cryptocurrency
    Query params:
        - fiat: target fiat currency (default: USD)
    """
    try:
        currency = currency.upper()
        fiat = request.args.get('fiat', 'USD').lower()
        
        if currency not in CRYPTO_IDS:
            return jsonify({
                "error": "Invalid currency",
                "message": f"Supported currencies: {', '.join(CRYPTO_IDS.keys())}"
            }), 400
        
        # Fetch price
        prices = fetch_prices_from_coingecko([currency], fiat)
        
        return jsonify({
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "currency": currency,
            "fiat": fiat.upper(),
            "price": prices.get(currency),
            "source": "coingecko"
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": "Failed to fetch price",
            "message": str(e)
        }), 500


def fetch_prices_from_hyperindex(currencies, fiat='usd'):
    """
    Fetch prices from Envio HyperIndex by querying DEX swap events
    HyperIndex indexes on-chain DEX data (Uniswap, Sushiswap, etc.)
    Returns dict with currency code as key and price as value
    """
    if not ENVIO_API_TOKEN:
        raise ValueError("ENVIO_API_TOKEN not configured")
    
    try:
        # GraphQL query to get latest swap prices from indexed DEX data
        # This is a sample query - adjust based on your HyperIndex schema
        query = """
        query GetLatestPrices($tokens: [String!]!) {
          swaps(
            where: {token0: {_in: $tokens}}
            order_by: {timestamp: desc}
            limit: 10
          ) {
            token0
            token1
            amount0
            amount1
            price
            timestamp
          }
        }
        """
        
        # Get token addresses for requested currencies
        token_addresses = [TOKEN_ADDRESSES.get(CRYPTO_IDS[c]["token"]) for c in currencies if CRYPTO_IDS[c]["token"] in TOKEN_ADDRESSES]
        
        variables = {
            "tokens": token_addresses
        }
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        # Add authorization if token is configured
        if ENVIO_API_TOKEN:
            headers['Authorization'] = f'Bearer {ENVIO_API_TOKEN}'
        
        response = requests.post(
            ENVIO_GRAPHQL_URL,
            json={'query': query, 'variables': variables},
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Parse GraphQL response and calculate prices
        # This is simplified - actual implementation depends on your schema
        prices = {}
        
        if 'data' in data and 'swaps' in data['data']:
            swaps = data['data']['swaps']
            
            # Calculate average price from recent swaps
            for currency in currencies:
                # Find swaps for this token and calculate TWAP (Time-Weighted Average Price)
                token_swaps = [s for s in swaps if s.get('token0') == TOKEN_ADDRESSES.get(CRYPTO_IDS[currency]["token"])]
                
                if token_swaps:
                    avg_price = sum(float(s.get('price', 0)) for s in token_swaps[:5]) / min(len(token_swaps), 5)
                    
                    prices[currency] = {
                        "value": avg_price,
                        "currency": fiat.upper(),
                        "formatted": f"${avg_price:,.2f}" if fiat == 'usd' else f"{avg_price:,.2f} {fiat.upper()}",
                        "source": "on-chain-dex"
                    }
        
        # If HyperIndex doesn't have data, raise exception to trigger fallback
        if not prices:
            raise ValueError("No price data available in HyperIndex")
        
        return prices
        
    except Exception as e:
        print(f"❌ HyperIndex API error: {str(e)}")
        raise


def fetch_prices_from_coingecko(currencies, fiat='usd'):
    """
    Fetch prices from CoinGecko API
    Returns dict with currency code as key and price as value
    """
    try:
        # Build CoinGecko IDs list
        coingecko_ids = [CRYPTO_IDS[c]["coingecko"] for c in currencies]
        ids_param = ','.join(coingecko_ids)
        
        # Make request to CoinGecko
        url = f"{COINGECKO_API_BASE}/simple/price"
        params = {
            'ids': ids_param,
            'vs_currencies': fiat
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Map back to our currency codes
        prices = {}
        for currency in currencies:
            coingecko_id = CRYPTO_IDS[currency]["coingecko"]
            if coingecko_id in data and fiat in data[coingecko_id]:
                prices[currency] = {
                    "value": data[coingecko_id][fiat],
                    "currency": fiat.upper(),
                    "formatted": f"${data[coingecko_id][fiat]:,.2f}" if fiat == 'usd' else f"{data[coingecko_id][fiat]:,.2f} {fiat.upper()}"
                }
        
        return prices
        
    except Exception as e:
        print(f"❌ CoinGecko API error: {str(e)}")
        raise


def fetch_prices_from_envio(currencies, fiat='usd'):
    """
    Legacy function - kept for compatibility
    Now calls fetch_prices_from_hyperindex
    """
    return fetch_prices_from_hyperindex(currencies, fiat)


@app.route('/envio/graphql', methods=['POST'])
def envio_graphql():
    """
    Direct GraphQL proxy to Envio HyperIndex
    Allows custom queries to the indexed blockchain data
    """
    try:
        if not ENVIO_API_TOKEN:
            return jsonify({
                "error": "Envio API token not configured",
                "message": "Please set ENVIO_API_TOKEN in .env file"
            }), 500
        
        # Get GraphQL query from request body
        graphql_request = request.get_json()
        
        if not graphql_request:
            return jsonify({
                "error": "Invalid request",
                "message": "GraphQL query required in request body"
            }), 400
        
        print(f"🔄 Proxying GraphQL query to Envio HyperIndex")

        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {ENVIO_API_TOKEN}'
        }

        # Forward the GraphQL request to Envio HyperIndex
        response = requests.post(
            ENVIO_GRAPHQL_URL,
            json=graphql_request,
            headers=headers,
            timeout=30
        )
        
        print(f"✅ HyperIndex response: {response.status_code}")

        # Return the response
        return Response(
            response.content,
            status=response.status_code,
            headers={'Content-Type': 'application/json'}
        )

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Request to Envio HyperIndex timed out",
            "message": "The request took too long to complete"
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Proxy error",
            "message": str(e)
        }), 502

    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500


@app.route('/envio/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def envio_proxy(path):
    """
    Generic proxy for Envio HyperIndex API
    Forwards requests to Envio with authentication
    Use this for custom Envio HyperIndex queries
    """
    try:
        if not ENVIO_API_TOKEN:
            return jsonify({
                "error": "Envio API token not configured",
                "message": "Please set ENVIO_API_TOKEN in .env file"
            }), 500
        
        # Remove leading slash to avoid double slashes
        path = path.lstrip('/')
        
        # Construct the full Envio HyperIndex URL
        # Note: Most HyperIndex interactions should use GraphQL endpoint
        url = f"{ENVIO_GRAPHQL_URL.rsplit('/graphql', 1)[0]}/{path}"
        
        print(f"🔄 Proxying {request.method} to Envio: {url}")

        # Get query parameters from the original request
        params = request.args.to_dict()

        # Prepare headers
        headers = {key: value for key, value in request.headers if key.lower() not in ['host', 'connection']}
        headers['Authorization'] = f'Bearer {ENVIO_API_TOKEN}'
        headers['Content-Type'] = 'application/json'

        # Get request body if present
        data = None
        json_data = None

        if request.is_json:
            json_data = request.get_json()
        elif request.data:
            data = request.data

        # Forward the request to Envio HyperIndex API
        response = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            params=params,
            json=json_data,
            data=data,
            allow_redirects=False,
            timeout=30
        )
        
        print(f"✅ Envio response: {response.status_code}")

        # Create response with the same status code and headers
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        response_headers = [
            (name, value) for name, value in response.raw.headers.items()
            if name.lower() not in excluded_headers
        ]

        # Return the response exactly as received from Envio
        return Response(
            response.content,
            status=response.status_code,
            headers=response_headers
        )

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Request to Envio API timed out",
            "message": "The request took too long to complete"
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Proxy error",
            "message": str(e)
        }), 502

    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "False").lower() == "true"

    print("=" * 60)
    print(f"🚀 Envio HyperIndex Price Proxy Server")
    print("=" * 60)
    print(f"📡 Port: {port}")
    print(f"🔗 HyperIndex GraphQL: {ENVIO_GRAPHQL_URL}")
    print(f"🔐 Envio Token: {'✓ Configured (using HyperIndex)' if ENVIO_API_TOKEN else '⚠️  Not configured (CoinGecko fallback only)'}")
    print(f"💰 Supported Currencies: {', '.join(CRYPTO_IDS.keys())}")
    print("=" * 60)
    print("\n📌 Available Endpoints:")
    print(f"  • GET  /health - Health check")
    print(f"  • GET  /prices?currencies=BTC,ETH,ICP,PLT&fiat=USD&source=auto - Get prices")
    print(f"  • GET  /price/<currency>?fiat=USD - Get single price")
    print(f"  • POST /envio/graphql - GraphQL proxy to HyperIndex")
    print(f"  • *    /envio/<path> - Generic Envio proxy")
    print("=" * 60)
    print("\n💡 Data Sources:")
    print(f"  • Primary: Envio HyperIndex (on-chain DEX data via GraphQL)")
    print(f"  • Fallback: CoinGecko API (off-chain price feed)")
    print("=" * 60 + "\n")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
