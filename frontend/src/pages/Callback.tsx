import { useHandleSignInCallback } from '@logto/react';
import { useNavigate } from 'react-router';

export function Callback() {
  const navigate = useNavigate();

  const { isLoading } = useHandleSignInCallback(() => {
    // After successful sign-in, redirect to verification
    // window.location.replace('/');
    navigate('/');
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  return null;
}
