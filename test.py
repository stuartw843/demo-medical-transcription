import requests
url = "https://api.murf.ai/v1/speech/voices"

payload={}
headers = {
  'Accept': 'application/json',
  'api-key': 'ap2_5f60d9c0-21ae-4d2e-acc4-d78a2fde4463'
}

response = requests.request("GET", url, headers=headers, data=payload)



# Save formatted JSON to file
with open('voices.txt', 'w') as f:
    f.write(response.text)
