const arpScanModal = document.getElementById('arpScan');
if (arpScanModal) {
  arpScanModal.addEventListener('shown.bs.modal', function() {
    const loadingMessage = document.getElementById('loadingMessage');
    const resultsList = document.getElementById('arpScanResults');

    // Reset and show loading message
    loadingMessage.innerHTML = `
      <div class="scan-loading-wrapper">
        <div class="scan-radar">
          <div class="scan-ping"></div>
          <i class="fa-solid fa-tower-broadcast scan-radar-icon"></i>
        </div>
        <h6 class="scan-loading-title">Scanning Network</h6>
        <p class="scan-loading-subtitle">Discovering active devices on local interfaces...</p>
      </div>
    `;
    loadingMessage.style.display = 'block';
    resultsList.style.display = 'none';

    // Fetch ARP scan results
    fetch(`${arp_scan_url}`)
      .then(response => response.json())
      .then(data => {
        resultsList.innerHTML = ''; // Clear previous results

        // Hide loading message
        loadingMessage.style.display = 'none';

        // Check if the response contains a message
        if (data.message) {
          resultsList.innerHTML = `<li class="scan-device-item justify-content-center text-muted text-center py-4 fs-6">${data.message}</li>`;
          resultsList.style.display = 'block'; // Show the message
        } else {
          resultsList.style.display = 'block'; // Show results list
          data.forEach(device => {
            const listItem = document.createElement('li');
            listItem.className = 'scan-device-item';
            
            listItem.innerHTML = `
              <div class="d-flex align-items-center gap-3">
                <div class="scan-device-icon">
                  <i class="fa-solid fa-network-wired"></i>
                </div>
                <div>
                  <div class="scan-device-name">${device.name || device.ip}</div>
                  <div class="scan-device-meta">
                    <span><i class="fa-solid fa-microchip me-1"></i>${device.mac}</span>
                    <span><i class="fa-solid fa-network-wired me-1"></i>${device.ip}</span>
                  </div>
                </div>
              </div>
              <div class="d-none d-sm-block">
                <span class="scan-device-badge"><i class="fa-solid fa-plus me-1"></i>Select</span>
              </div>
            `;

            // Add click event to populate form and transition back automatically
            listItem.onclick = function() {
              // Set the values in the Add Computer modal
              const nameInput = document.getElementById('name');
              if (nameInput && device.name && device.name !== 'Unknown Device' && !device.name.includes('(')) {
                nameInput.value = device.name;
              }
              document.getElementById('ip_address').value = device.ip;
              document.getElementById('mac_address').value = device.mac;
              document.getElementById('test_type').value = 'arp';

              // Transition back to the form modal automatically
              const backBtn = arpScanModal.querySelector('[data-bs-target="#addComputer"]');
              if (backBtn) {
                backBtn.click();
              }
            };

            resultsList.appendChild(listItem);
          });
        }
      })
      .catch(error => {
        console.error('Error fetching ARP scan results:', error);
        loadingMessage.innerHTML = `
          <div class="scan-error-wrapper">
            <div class="scan-error-icon">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h6 class="scan-error-title">Network Scan Failed</h6>
            <p class="scan-error-subtitle">Please ensure the backend service is running and has correct network scan privileges.</p>
          </div>
        `;
      });
  });
}
