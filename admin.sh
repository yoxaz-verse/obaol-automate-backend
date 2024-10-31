#!/bin/bash

# update-admin-auth.sh - A script to integrate authentication into the Admin module

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display informational messages
function echo_info {
  echo -e "\e[34m[UPDATE]\e[0m $1"
}

# Function to display error messages
function echo_error {
  echo -e "\e[31m[ERROR]\e[0m $1"
}

# 1. Update Routes to Add Login Functionality
echo_info "Updating adminRoute.ts to add login functionality..."

ADMIN_ROUTE_FILE="src/routes/adminRoute.ts"

if [ ! -f "$ADMIN_ROUTE_FILE" ]; then
  echo_error "adminRoute.ts not found. Please make sure the Admin module is generated."
  exit 1
fi

# Backup the original file
cp "$ADMIN_ROUTE_FILE" "${ADMIN_ROUTE_FILE}.bak"

# Add login route and import statements
sed -i '/import AdminService from/a import AuthMiddleware from "..\/middlewares\/auth";' "$ADMIN_ROUTE_FILE"

sed -i '/const adminMiddleware = new AdminMiddleware();/a const authMiddleware = new AuthMiddleware();' "$ADMIN_ROUTE_FILE"

# Insert login route after const declarations
sed -i '/const authMiddleware = new AuthMiddleware();/a \
\n// LOGIN an admin (Public route)\
router.post(\
  "/login",\
  adminMiddleware.validateLogin.bind(adminMiddleware),\
  adminService.login.bind(adminService)\
);\n' "$ADMIN_ROUTE_FILE"

# Protect routes below login
sed -i '/router.post(\
  "\/login",/a \
// Apply authentication middleware to all routes below\
router.use(authMiddleware.authenticate.bind(authMiddleware));\n' "$ADMIN_ROUTE_FILE"

echo_info "adminRoute.ts updated with login functionality."

# 2. Implement validateLogin in AdminMiddleware
echo_info "Updating admin.ts in middlewares to implement validateLogin..."

ADMIN_MIDDLEWARE_FILE="src/middlewares/admin.ts"

if [ ! -f "$ADMIN_MIDDLEWARE_FILE" ]; then
  echo_error "admin.ts middleware not found."
  exit 1
fi

# Backup the original file
cp "$ADMIN_MIDDLEWARE_FILE" "${ADMIN_MIDDLEWARE_FILE}.bak"

# Add validateLogin method
sed -i '/class AdminMiddleware {/a \
\n  public async validateLogin(req: Request, res: Response, next: NextFunction) {\
    try {\
      const { email, password } = req.body;\
      if (!email || !password) {\
        res.sendError(\
          "ValidationError: Email and Password are required",\
          "Email and Password are required",\
          400\
        );\
        return;\
      }\
      next();\
    } catch (error) {\
      await logError(error, req, "AdminMiddleware-validateLogin");\
      res.sendError(error, "An unexpected error occurred", 500);\
    }\
  }\
' "$ADMIN_MIDDLEWARE_FILE"

echo_info "validateLogin method added to AdminMiddleware."

# 3. Implement login Method in AdminService
echo_info "Updating admin.ts in services to implement login method..."

ADMIN_SERVICE_FILE="src/services/admin.ts"

if [ ! -f "$ADMIN_SERVICE_FILE" ]; then
  echo_error "admin.ts service not found."
  exit 1
fi

# Backup the original file
cp "$ADMIN_SERVICE_FILE" "${ADMIN_SERVICE_FILE}.bak"

# Import necessary utilities
sed -i '/import { Request, Response } from "express";/a import { comparePasswords } from "../utils/passwordUtils";\nimport { generateJWTToken } from "../utils/tokenUtils";' "$ADMIN_SERVICE_FILE"

# Add login method
sed -i '/class AdminService {/a \
\n  public async login(req: Request, res: Response) {\
    try {\
      const { email, password } = req.body;\
      const admin = await this.adminRepository.getAdminByEmail(req, email);\
      if (!admin) {\
        res.sendError("Invalid email or password", "Authentication failed", 401);\
        return;\
      }\
      // Compare passwords\
      const isMatch = await comparePasswords(password, admin.password);\
      if (!isMatch) {\
        res.sendError("Invalid email or password", "Authentication failed", 401);\
        return;\
      }\
      // Generate JWT token\
      const token = generateJWTToken(admin);\
      res.sendFormatted({ token }, "Login successful");\
    } catch (error) {\
      await logError(error, req, "AdminService-login");\
      res.sendError(error, "Login failed");\
    }\
  }\
' "$ADMIN_SERVICE_FILE"

echo_info "login method added to AdminService."

# 4. Implement Password Utilities
echo_info "Creating passwordUtils.ts in utils..."

mkdir -p src/utils

cat <<EOT > src/utils/passwordUtils.ts
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
EOT

echo_info "passwordUtils.ts created."

# Install bcryptjs if not installed
if ! npm list bcryptjs >/dev/null 2>&1; then
  echo_info "Installing bcryptjs..."
  npm install bcryptjs
fi

# 5. Implement Token Utilities
echo_info "Creating tokenUtils.ts in utils..."

cat <<EOT > src/utils/tokenUtils.ts
import jwt from "jsonwebtoken";
import { IAdmin } from "../interfaces/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export function generateJWTToken(admin: IAdmin): string {
  const payload = {
    id: admin._id,
    email: admin.email,
    isSuperAdmin: admin.isSuperAdmin,
    // Include other necessary fields
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
  return token;
}

export function verifyJWTToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
EOT

echo_info "tokenUtils.ts created."

# Install jsonwebtoken if not installed
if ! npm list jsonwebtoken >/dev/null 2>&1; then
  echo_info "Installing jsonwebtoken..."
  npm install jsonwebtoken
fi

# 6. Create AuthMiddleware for Authentication
echo_info "Creating auth.ts in middlewares..."

cat <<EOT > src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyJWTToken } from "../utils/tokenUtils";
import { logError } from "../utils/errorLogger";

class AuthMiddleware {
  public async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.sendError(
          "AuthenticationError: Token not provided",
          "Authentication failed",
          401
        );
        return;
      }

      const token = authHeader.substring(7);

      const decoded = verifyJWTToken(token);

      // Attach decoded user to request
      req.user = decoded;
      next();
    } catch (error) {
      await logError(error, req, "AuthMiddleware-authenticate");
      res.sendError("AuthenticationError: Invalid token", "Authentication failed", 401);
    }
  }
}

export default AuthMiddleware;
EOT

echo_info "AuthMiddleware created."

# 7. Extend Express Request Interface
echo_info "Extending Express Request interface..."

mkdir -p src/types/express

cat <<EOT > src/types/express/index.d.ts
declare namespace Express {
  interface Request {
    user?: any;
  }
}
EOT

# Update tsconfig.json to include types
if [ -f "tsconfig.json" ]; then
  if ! grep -q '"typeRoots": \[' tsconfig.json; then
    sed -i '/"compilerOptions": {/a \
    \  "typeRoots": ["./src/types", "./node_modules/@types"],' tsconfig.json
  else
    echo_info "typeRoots already specified in tsconfig.json."
  fi
else
  echo_error "tsconfig.json not found. Please ensure TypeScript is properly set up."
  exit 1
fi

echo_info "Express Request interface extended."

# 8. Update AdminRepository
echo_info "Updating AdminRepository to add getAdminByEmail..."

ADMIN_REPOSITORY_FILE="src/database/repositories/admin.ts"

if [ ! -f "$ADMIN_REPOSITORY_FILE" ]; then
  echo_error "AdminRepository not found."
  exit 1
fi

# Backup the original file
cp "$ADMIN_REPOSITORY_FILE" "${ADMIN_REPOSITORY_FILE}.bak"

# Add getAdminByEmail method
sed -i '/class AdminRepository {/a \
\n  public async getAdminByEmail(req: Request, email: string): Promise<IAdmin | null> {\
    try {\
      const admin = await AdminModel.findOne({ email, isDeleted: false }).lean<IAdmin>();\
      return admin;\
    } catch (error) {\
      await logError(error, req, "AdminRepository-getAdminByEmail");\
      throw error;\
    }\
  }\
' "$ADMIN_REPOSITORY_FILE"

# Update getAdminById and getAdmins to exclude password field
sed -i 's/findById(id)/findById(id).select("-password")/g' "$ADMIN_REPOSITORY_FILE"
sed -i 's/lean<IAdmin>();/lean<IAdmin>();/g' "$ADMIN_REPOSITORY_FILE"

sed -i 's/.find(query)/.find(query).select("-password")/g' "$ADMIN_REPOSITORY_FILE"

echo_info "AdminRepository updated."

# 9. Update createAdmin in AdminService to Hash Password
echo_info "Updating createAdmin in AdminService to hash password..."

# Import hashPassword
sed -i '/import { comparePasswords } from "..\/utils\/passwordUtils";/a import { hashPassword } from "../utils/passwordUtils";' "$ADMIN_SERVICE_FILE"

# Add password hashing in createAdmin
sed -i '/const adminData = req.body;/a \
    // Hash password\
    adminData.password = await hashPassword(adminData.password);\
' "$ADMIN_SERVICE_FILE"

echo_info "createAdmin method updated to hash passwords."

# 10. Install Type Definitions for JSON Web Token
echo_info "Installing @types/jsonwebtoken..."
npm install --save-dev @types/jsonwebtoken

# 11. Update .gitignore to Ignore Backup Files
echo_info "Updating .gitignore to ignore backup files..."

if [ -f ".gitignore" ]; then
  if ! grep -q "*.bak" .gitignore; then
    echo "*.bak" >> .gitignore
  fi
else
  echo "*.bak" > .gitignore
fi

echo_info ".gitignore updated."

# 12. Final Message
echo_info "Authentication integrated into Admin module successfully."
echo_info "You can now use the login endpoint at '/api/admins/login'."
echo_info "Protected routes require a valid JWT token in the Authorization header."

echo_info "Script execution completed."
