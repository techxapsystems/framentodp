import bcryptjs from 'bcryptjs';

const password = 'Admin@2026';
const hash = '$2b$10$NYwLzXSDykwcp73tZDkVSuCVz9OLH0vS2s2nuISZOzI/HblQO4WFS';

const isValid = bcryptjs.compareSync(password, hash);
console.log('Password matches:', isValid);
