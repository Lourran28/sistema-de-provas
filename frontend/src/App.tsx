import { RouterProvider } from "react-router-dom";

import { router } from "./app/router";
import { ConfirmationProvider } from "./components/ui/ConfirmationDialog";
import { AuthProvider } from "./features/auth/AuthProvider";

export function App() {
  return (
    <ConfirmationProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfirmationProvider>
  );
}

export default App;
