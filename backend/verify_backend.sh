#!/bin/bash
set -e

echo "=== Backend Verification Start ==="

# 1. Health Check
echo "Testing Health..."
curl -f http://localhost:8001/
echo ""

# 2. Page Count (New Endpoint)
echo "Testing Page Count..."
curl -f -X POST http://localhost:8001/page-count -F "file=@sample.pdf"
echo ""

# 3. Detect Tables (Phase 1.5 Endpoint)
echo "Testing Detect Tables..."
curl -f -X POST http://localhost:8001/detect-tables -F "file=@sample.pdf" -F "page=1" > detect_output.json
if grep -q "areas" detect_output.json; then
  echo "Detect Tables Successful"
  cat detect_output.json
else
  echo "Detect Tables Failed"
  cat detect_output.json
  exit 1
fi
echo ""


# 4. Extract Tables (Regions JSON)
echo "Testing Extract Tables (Regions JSON)..."
# JSON: [{"page":1, "top":0.1, "left":0.1, "bottom":0.5, "right":0.9}]
echo '[{"page":1,"top":0.0,"left":0.0,"bottom":1.0,"right":1.0}]' > regions.json
curl -f -X POST "http://localhost:8001/extract" \
  -F "file=@sample.pdf" \
  -F "regions=<regions.json" \
  -F "mode=lattice" > extract_regions_output.json

if grep -q "tables" extract_regions_output.json; then
  echo "Extract Tables (Regions) Successful"
  cat extract_regions_output.json
else
  echo "Extract Tables (Regions) Failed"
  cat extract_regions_output.json
  exit 1
fi
echo ""

# 5. Legacy Extract (Relative Area - for verification)
echo "Testing Extract Tables (Legacy Relative Area)..."
curl -f -X POST http://localhost:8001/extract \
  -F "file=@sample.pdf" \
  -F "area=10,10,50,90" \
  -F "mode=lattice" \
  -F "pages=1" > extract_output.json
if grep -q "tables" extract_output.json; then
  echo "Extract Tables Successful"
  # Optional: Check if count > 0 if we know sample.pdf has tables in that area
else
  echo "Extract Tables Failed"
  cat extract_output.json
  exit 1
fi
echo ""

# Cleanup
rm detect_output.json

echo "=== Backend Verification Passed! ==="
