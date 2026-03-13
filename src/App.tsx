/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { DialogProvider } from './context/DialogContext';
import { ViewManager } from './components/ViewManager';

export default function App() {
  return (
    <DialogProvider>
      <AuthProvider>
        <ExpenseProvider>
          <ViewManager />
        </ExpenseProvider>
      </AuthProvider>
    </DialogProvider>
  );
}
