import { applyColorMode } from "~/utils/colorMode";
import { applyUiTheme } from "~/utils/uiTheme";

export default defineNuxtPlugin(() => {
  applyUiTheme();
  applyColorMode();
});
