import sys
import os
from datetime import date, datetime
import logging

# Ensure /app is in the sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure basic logging so we can see output in cron logs / stdout
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [CRON-TRIGGER] %(message)s')
logger = logging.getLogger(__name__)

from wol import app, db, Computer, send_wol_packet, send_l2_wol_packet, l2_wol_packet, l2_interface

def main():
  if len(sys.argv) < 2:
    logger.error("Usage: python cron_trigger.py <mac_address>")
    sys.exit(1)

  mac_arg = sys.argv[1]

  with app.app_context():
    # 1. Determine the computer matching either the normal MAC or reversed MAC (for SOL)
    computer = Computer.query.filter_by(mac_address=mac_arg).first()
    is_sol = False
    if not computer:
      reversed_mac = ':'.join(reversed(mac_arg.split(':')))
      computer = Computer.query.filter_by(mac_address=reversed_mac).first()
      if computer:
        is_sol = True
      else:
        logger.error(f"Computer with MAC address {mac_arg} not found in database.")
        sys.exit(1)

    # 2. Check if schedules are paused
    if computer.schedules_paused:
      logger.info(f"Trigger skipped for {computer.name} ({mac_arg}): schedules are paused.")
      sys.exit(0)

    # 3. Check if today's weekday is excluded
    today = date.today()
    current_weekday = today.weekday() # 0 = Monday, ..., 6 = Sunday
    if computer.excluded_days:
      try:
        excluded_list = [int(x.strip()) for x in computer.excluded_days.split(',') if x.strip().isdigit()]
        if current_weekday in excluded_list:
          logger.info(f"Trigger skipped for {computer.name} ({mac_arg}): today ({today.strftime('%A')}) is an excluded day.")
          sys.exit(0)
      except Exception as e:
        logger.error(f"Error parsing excluded_days for {computer.name}: {e}")

    # 4. Check if vacation mode is active (today <= vacation_until)
    if computer.vacation_until:
      try:
        vacation_date = datetime.strptime(computer.vacation_until, '%Y-%m-%d').date()
        if today <= vacation_date:
          logger.info(f"Trigger skipped for {computer.name} ({mac_arg}): active vacation mode (until {computer.vacation_until}).")
          sys.exit(0)
      except ValueError:
        logger.error(f"Invalid vacation_until date format for {computer.name}: {computer.vacation_until}")

    # 5. Check if schedule has expired
    expiry_date_str = computer.cron_sol_until if is_sol else computer.cron_wol_until
    if expiry_date_str:
      try:
        expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
        if today > expiry_date:
          logger.info(f"Trigger skipped for {computer.name} ({mac_arg}): schedule expired on {expiry_date_str}.")
          sys.exit(0)
      except ValueError:
        logger.error(f"Invalid expiry date format for {computer.name}: {expiry_date_str}")

    # 6. All checks passed: Send the magic packet!
    if is_sol:
      logger.info(f"Sending Sleep On LAN magic packet to {computer.name} (using reversed MAC: {mac_arg})")
      send_wol_packet(mac_arg)
    else:
      if l2_wol_packet:
        logger.info(f"Sending Wake On LAN magic packet (L2 Mode) to {computer.name} (MAC: {mac_arg}) via interface {l2_interface}")
        send_l2_wol_packet(mac_arg, l2_interface)
      else:
        logger.info(f"Sending Wake On LAN magic packet (L4 Mode) to {computer.name} (MAC: {mac_arg})")
        send_wol_packet(mac_arg)

if __name__ == '__main__':
  main()
