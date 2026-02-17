#!/usr/bin/env python3
import json
import secrets

def generate_unique_code(length=12):
    """Generate a random hex string of specified length"""
    return secrets.token_hex(length // 2)

def add_metadata_to_records(input_file, output_file):
    """Add unique metadata codes to each record in the JSON file"""
    
    # Read the JSON file
    print(f"Reading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    print(f"Found {len(data)} records")
    
    # Keep track of generated codes to ensure uniqueness
    used_codes = set()
    
    # Add metadata to each record
    for i, record in enumerate(data):
        # Generate a unique code
        while True:
            code = generate_unique_code(12)
            if code not in used_codes:
                used_codes.add(code)
                break
        
        # Add metadata field
        record['metadata'] = {
            'unique_code': code
        }
        
        if (i + 1) % 100 == 0:
            print(f"Processed {i + 1} records...")
    
    # Write back to file
    print(f"Writing to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Done! Added metadata to {len(data)} records")

if __name__ == '__main__':
    add_metadata_to_records('output.json', 'output.json')
