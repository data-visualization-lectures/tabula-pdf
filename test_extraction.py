
import tabula
import json
import pandas as pd

# Standard A3 Landscape dimensions from inspection
# W = 1190.52, H = 841.92
W = 1190.52
H = 841.92

pdf_path = "mono-hojo-tokyo.pdf"

print(f"Testing extraction on {pdf_path}")

# Test 1: Full Page Extraction (allowing Tabula to guess or full area)
# area = [top, left, bottom, right]
# Full page: [0, 0, H, W]
full_area = [0, 0, H, W]
print(f"Test 1: Full Page Area: {full_area}")

try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="2",
        multiple_tables=True, 
        lattice=True, # Try lattice first
        area=full_area
    )
    print(f"Lattice Mode Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
        print(df.head())
except Exception as e:
    print(f"Lattice failed: {e}")

try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        stream=True, # Try stream
        area=full_area
    )
    print(f"Stream Mode Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
        print(df.head())
except Exception as e:
    print(f"Stream failed: {e}")

# Test 2: Specific Region (e.g., Top Left 50%)
# Top Left 50%
# top=0, left=0, bottom=H/2, right=W/2
half_area = [0, 0, 420.96, 595.26]
print(f"Test 2: Top-Left Quadrant: {half_area}")
try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        lattice=True,
        area=half_area
    )
    print(f"Half-Page Lattice Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
except Exception as e:
    print(f"Half-Page failed: {e}")

# Test 3: Very Small / Empty Area (Top Left Margin)
# [0, 0, 50, 50]
small_area = [0, 0, 50, 50]
print(f"Test 3: Small Area (50x50): {small_area}")
try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        lattice=True,
        area=small_area,
        pandas_options={"dtype": str} # Match main.py
    )
    print(f"Small Area Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
        print(df)
except Exception as e:
    print(f"Small Area failed: {e}")

# Test 4: Footer Area (Bottom 50pt strip)
# [H-50, 0, H, W]
footer_area = [H-50, 0, H, W]
print(f"Test 4: Footer Area: {footer_area}")
try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        lattice=True,
        area=footer_area
    )
    print(f"Footer Lattice Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
        print(df)
    
    dfs_stream = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        stream=True,
        area=footer_area
    )
    print(f"Footer Stream Results: {len(dfs_stream)} tables found")
    for i, df in enumerate(dfs_stream):
        print(f"Table {i}: Shape {df.shape}")
        print(df)
except Exception as e:
    print(f"Footer failed: {e}")

# Test 5: Header Area (Top 50pt strip)
# [0, 0, 50, W]
header_area = [0, 0, 50, W]
print(f"Test 5: Header Area: {header_area}")
try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        lattice=True,
        area=header_area
    )
    print(f"Header Lattice Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
        print(df)

    dfs_stream = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        stream=True,
        area=header_area
    )
    print(f"Header Stream Results: {len(dfs_stream)} tables found")
    for i, df in enumerate(dfs_stream):
        print(f"Table {i}: Shape {df.shape}")
        print(df)
except Exception as e:
    print(f"Header failed: {e}")

# Test 6: Multi-Area (Full Page + Small Empty Area)
# [[0, 0, H, W], [0, 0, 50, 50]]
multi_area = [[0, 0, H, W], [0, 0, 50, 50]]
print(f"Test 6: Multi-Area: {multi_area}")
try:
    dfs = tabula.read_pdf(
        pdf_path,
        pages="1",
        multiple_tables=True,
        lattice=True,
        area=multi_area
    )
    print(f"Multi-Area Lattice Results: {len(dfs)} tables found")
    for i, df in enumerate(dfs):
        print(f"Table {i}: Shape {df.shape}")
        print(df)
except Exception as e:
    print(f"Multi-Area failed: {e}")




