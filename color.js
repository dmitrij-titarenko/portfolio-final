document.addEventListener('DOMContentLoaded', () => {
    const colorPicker = document.querySelector('.color-picker-container');
    const colorMenu = document.querySelector('.color-menu');
    const menuItems = document.querySelectorAll('.menu-item');
  
    // Make "black" selected by default
    const defaultColor = menuItems[0]; // Assuming "black" is the first menu item
    defaultColor.classList.add('selected'); // Add the "selected" class
    defaultColor.querySelector('.icon').textContent = '<'; // Set the icon to '<'
    document.querySelector('.selected-color').style.backgroundColor = getColor('black'); // Set the circle color
    document.querySelector('.color-name').textContent = 'black'; // Set the color label
  
    // Add click event to toggle the menu visibility
    colorPicker.addEventListener('click', () => {
      const reversedMenuItems = Array.from(colorMenu.children).reverse(); // Reverse the order for bottom-to-top animation
  
      if (!colorMenu.classList.contains('visible')) {
        // Open menu with sequential animation from bottom to top
        colorMenu.classList.add('visible');
        reversedMenuItems.forEach((item, index) => {
          item.style.transitionDelay = `${index * 0.03}s`; // Add delay based on index
          item.classList.add('fade-in'); // Add animation class
        });
      } else {
        // Close menu and reset animation
        closeMenu(reversedMenuItems);
      }
    });
  
    // Handle selecting a color
    menuItems.forEach((item) => {
      item.addEventListener('click', () => {
        // Remove "selected" state from all menu items
        menuItems.forEach((menuItem) => {
          menuItem.classList.remove('selected');
          menuItem.querySelector('.icon').textContent = '-'; // Reset all icons to '-'
        });
  
        // Add "selected" state to the clicked menu item
        item.classList.add('selected');
        item.querySelector('.icon').textContent = '<'; // Replace '-' with '<' for the selected item
  
        // Update the circle color based on the selected color
        const selectedColor = item.querySelector('span:first-child').textContent;
        document.querySelector('.selected-color').style.backgroundColor = getColor(selectedColor);
  
        // Update the "color" text to the selected color name
        document.querySelector('.color-name').textContent = selectedColor;
  
        // Add a delay before closing the menu
        setTimeout(() => closeMenu(Array.from(colorMenu.children).reverse()), 500); // 500ms delay
      });
    });
  
    // Helper function to close the menu
    function closeMenu(menuItems) {
      menuItems.forEach((item) => {
        item.style.transitionDelay = '0s'; // Reset delay
        item.classList.remove('fade-in'); // Remove animation class
      });
      colorMenu.classList.remove('visible');
    }
  
    // Helper function to map color names to their corresponding CSS values
    function getColor(colorName) {
      const colors = {
        black: 'rgba(0, 0, 0, 1)',
        purple: 'rgba(25, 13, 0, 1)',
        navy: 'rgba(0, 0, 25, 1)',
        burgundy: 'rgba(25, 0, 0, 1)',
      };
      return colors[colorName] || 'rgba(0, 0, 0, 1)'; // Default to black
    }
  });