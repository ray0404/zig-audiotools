from playwright.sync_api import sync_playwright, expect
import os
import time

def run(page):
    print("Navigating to page...")
    page.goto("http://localhost:5173")

    # Wait for page to load
    page.wait_for_selector("text=Sonic Forge")
    print("Page loaded.")

    # Upload file
    file_path = os.path.abspath("node_modules/lamejs/testdata/Stereo44100.wav")
    print(f"Uploading file: {file_path}")
    page.set_input_files('input[type="file"]', file_path)

    # Wait for "Open Audio" button text to change to "Change File"
    print("Waiting for file load...")
    page.wait_for_selector("text=Change File", timeout=10000)
    print("File loaded.")

    # Click "Echo Vanish" button
    print("Clicking Echo Vanish...")
    page.get_by_role("button", name="Echo Vanish").click()

    # Wait for panel to appear
    print("Waiting for panel...")
    page.wait_for_selector("text=Reduction")
    page.wait_for_selector("text=Tail")

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/verification.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
