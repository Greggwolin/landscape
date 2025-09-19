#!/bin/bash

families=(1 2 3 4 5 6 8 9 10)
family_names=("Residential" "Commercial" "Industrial" "Common Areas" "Public" "Other" "Institutional" "Mixed Use" "Open Space")

missing_codes=()

for i in "${!families[@]}"; do
    family_id=${families[$i]}
    family_name=${family_names[$i]}

    echo "=== $family_name (Family $family_id) ==="

    # Get subtypes
    subtypes=$(curl -s "http://localhost:3004/api/landuse/choices?type=subtypes&family_id=$family_id" | jq -r '.[] | .code')

    # Get existing codes
    existing_codes=$(curl -s "http://localhost:3004/api/landuse/choices?type=codes" | jq -r ".[] | select(.family_id == \"$family_id\") | .landuse_code")

    echo "Subtypes: $(echo $subtypes | tr '\n' ' ')"
    echo "Codes: $(echo $existing_codes | tr '\n' ' ')"

    # Check for missing codes
    for subtype in $subtypes; do
        if ! echo "$existing_codes" | grep -q "^$subtype$"; then
            echo "❌ Missing code: $subtype"
            missing_codes+=("$family_id:$subtype")
        fi
    done

    echo ""
done

echo "=== SUMMARY ==="
if [ ${#missing_codes[@]} -eq 0 ]; then
    echo "✅ All families have complete land use codes"
else
    echo "❌ Missing codes found:"
    for missing in "${missing_codes[@]}"; do
        echo "  $missing"
    done
fi