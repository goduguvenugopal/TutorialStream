import { exec } from 'child_process';

const RULE_NAME = 'TutorialStream Server (Port 5000)';

/**
 * Check if the firewall rule already exists
 */
function checkFirewallRule() {
  return new Promise((resolve) => {
    exec(
      `netsh advfirewall firewall show rule name="${RULE_NAME}"`,
      (error, stdout) => {
        if (error || !stdout.includes(RULE_NAME)) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

/**
 * Add firewall rule using elevated PowerShell.
 * On NSIS install this runs silently (installer already has admin).
 * On runtime, it will prompt UAC once.
 */
function addFirewallRule(port = 5000) {
  return new Promise((resolve, reject) => {
    const commands = [
      `netsh advfirewall firewall add rule name="${RULE_NAME}" dir=in action=allow protocol=TCP localport=${port}`,
      `netsh advfirewall firewall add rule name="${RULE_NAME}" dir=out action=allow protocol=TCP localport=${port}`,
    ];

    const psCommand = commands.join('; ');

    // Use PowerShell -Verb RunAs to trigger UAC elevation
    exec(
      `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \\"${psCommand}\\"' -Wait"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error('Failed to add firewall rule:', error.message);
          reject(error);
        } else {
          console.log('Firewall rule added successfully for port', port);
          resolve(true);
        }
      }
    );
  });
}

/**
 * Ensure firewall rule exists. If not, prompt user for admin access to create it.
 */
export async function ensureFirewallRule(port = 5000) {
  try {
    const exists = await checkFirewallRule();
    if (exists) {
      console.log('Firewall rule already exists — port', port, 'is open.');
      return true;
    }

    console.log('Firewall rule not found. Requesting admin access to add it...');
    await addFirewallRule(port);
    return true;
  } catch (err) {
    console.error('Could not set firewall rule:', err.message);
    return false;
  }
}
