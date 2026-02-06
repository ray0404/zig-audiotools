import os
from playwright.sync_api import sync_playwright

def verify_plosive_guard(page):
    print("Navigating to homepage...")
    page.goto("http://localhost:5173")

    # Wait for the tool button to be visible
    print("Waiting for Plosive Guard button...")
    # Using partial text match or exact match
    # Since I labeled it "Plosive Guard"
    plosive_btn = page.get_by_text("Plosive Guard", exact=True)
    plosive_btn.wait_for()
    print("Found Plosive Guard button.")

    # Check for controls
    print("Checking for controls...")
    page.get_by_text("Sensitivity").wait_for()
    page.get_by_text("Strength").wait_for()
    page.get_by_text("Cutoff (Hz)").wait_for()
    print("Controls found.")

    # Take screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    # Scroll to make sure it's in view if needed (though it should be on sidebar)
    # The sidebar is fixed, so it should be visible.

    page.screenshot(path="/home/jules/verification/plosive_guard.png")
    print("Verification screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_plosive_guard(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
