#!/usr/bin/env python3
"""
GitHub PR Creation Script
Creates a pull request on GitHub using the GitHub API
"""

import json
import subprocess
import sys
import urllib.request
import urllib.error
import base64

def get_git_credentials():
    """Extract GitHub credentials from git credential manager"""
    try:
        cred_request = (
            "protocol=https\n"
            "host=github.com\n"
            "path=nguyenthaitan/Inventory-Management.git\n"
        )
        
        result = subprocess.run(
            ['git', 'credential', 'fill'],
            input=cred_request,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        creds = {}
        for line in result.stdout.split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                creds[key] = value
        
        return creds.get('username'), creds.get('password')
    except Exception as e:
        print(f"Error getting credentials: {e}", file=sys.stderr)
        return None, None

def create_pull_request():
    """Create a pull request on GitHub"""
    username, password = get_git_credentials()
    
    if not username or not password:
        print("ERROR: Could not retrieve GitHub credentials")
        return False
    
    print(f"✓ Found GitHub credentials for: {username}")
    
    # Read PR body
    try:
        with open('PHASE1_IMPLEMENTATION_SUMMARY.md', 'r', encoding='utf-8') as f:
            body = f.read()
    except FileNotFoundError:
        print("ERROR: PHASE1_IMPLEMENTATION_SUMMARY.md not found")
        return False
    
    # Create PR payload
    pr_data = {
        "title": "feat: Phase 1 Critical Fixes - Kafka Event Bus, Operator Workflows, Error Handling",
        "body": body,
        "head": "develop/full-system-implementation",
        "base": "main"
    }
    
    # Encode credentials for Basic Auth
    credentials = f"{username}:{password}".encode('utf-8')
    auth_header = base64.b64encode(credentials).decode('ascii')
    
    # Create API request
    url = "https://api.github.com/repos/nguyenthaitan/Inventory-Management/pulls"
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Python-GitHub-PR",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
    }
    
    try:
        print("Creating pull request...")
        req = urllib.request.Request(
            url,
            data=json.dumps(pr_data).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            print("\n" + "="*50)
            print("✅ PULL REQUEST CREATED SUCCESSFULLY!")
            print("="*50)
            print(f"PR Number:  #{result.get('number')}")
            print(f"URL:        {result.get('html_url')}")
            print(f"Title:      {result.get('title')}")
            print(f"State:      {result.get('state')}")
            print("="*50)
            return True
            
    except urllib.error.HTTPError as e:
        error_data = json.loads(e.read().decode('utf-8'))
        print(f"ERROR: Failed to create PR")
        print(f"Status: {e.code}")
        print(f"Message: {error_data.get('message', 'Unknown error')}")
        if 'errors' in error_data:
            print(f"Details: {error_data['errors']}")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = create_pull_request()
    sys.exit(0 if success else 1)
