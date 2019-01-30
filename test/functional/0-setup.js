/* eslint-env node, mocha */

// for unhandled promise rejection debugging
process.on("unhandledRejection", r => console.error(r)); // eslint-disable-line no-console

const {assert} = require("chai");
const utils = require("./utils");
const variations = require("../../src/variations.json");

const allPrefs = [
  "pref1",
  "pref2",
  "pref3",
];

async function checkPrefs(driver, prefs) {
  for (const pref of allPrefs) {
    if (prefs[pref] !== undefined) {
      const val = await utils.getPreference(driver, pref);
      assert.equal(val, prefs[pref], `set the right pref for ${pref}`);
    } else {
      const hasUserValue = await utils.prefHasUserValue(driver, pref);
      assert.isFalse(hasUserValue, `${pref} is set to the default`);
    }
  }
}

describe("setup and teardown", function() {
  // This gives Firefox time to start, and us a bit longer during some of the tests.
  this.timeout(15000);

  let driver;

  // runs ONCE
  before(async () => {
    driver = await utils.setupWebdriver.promiseSetupDriver(
      utils.FIREFOX_PREFERENCES,
    );
  });

  after(() => {
    driver.quit();
  });

  describe("sets up the correct prefs, depending on the variation", function() {
    const SETUP_DELAY = 500;
    let addonId;

    for (const variation in variations) {
      const prefs = variations[variation].prefs;
      describe(`sets the correct prefs for variation ${variation}`, () => {
        before(async () => {
          await utils.setPreference(driver, "extensions.multipreffer.test.variationName", variation);
          addonId = await utils.setupWebdriver.installAddon(driver);
          await driver.sleep(SETUP_DELAY);
        });

        it("has the correct prefs after install", async () => {
          await checkPrefs(driver, prefs.setValues);
        });

        it("has the correct prefs after uninstall", async () => {
          await utils.setupWebdriver.uninstallAddon(driver, addonId);
          let prefsToCheck = prefs.setValues;
          for (const pref of prefs.resetDefaults) {
            prefsToCheck[pref] = undefined;
          }
          for (const pref in prefs.resetValues) {
            prefsToCheck[pref] = prefs.resetValues[pref];
          }
          await checkPrefs(driver, prefsToCheck);
        });

        after(async () => {
          await utils.clearPreference(driver, "extensions.multipreffer.test.variationName");
        });
      });
    }
  });
});