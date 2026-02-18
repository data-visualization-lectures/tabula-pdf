
from pypdf import PdfReader
import sys

try:
    reader = PdfReader("mono-hojo-tokyo.pdf")
    print(f"Total Pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        print(f"Rotation: {page.rotation}")
        print(f"Raw /Rotate: {page.get('/Rotate')}")
        print(f"UserUnit: {page.get('/UserUnit')}")
        print(f"MediaBox: {page.mediabox}")
        print(f"CropBox: {page.cropbox}")
        print(f"ArtBox: {page.artbox}")
        print(f"TrimBox: {page.trimbox}")
        print(f"BleedBox: {page.bleedbox}")
except Exception as e:
    print(f"Error: {e}")
