import { useLogto } from '@logto/react';

import { appConfig } from '~/config/logto';

interface FeatureCardProps {
  title: string;
  description: string;
}

const FeatureCard = ({ title, description }: FeatureCardProps) => (
  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
    <h3 className="text-xl font-semibold mb-3 text-gray-800">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export function Landing() {
  const { signIn } = useLogto();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">Everything needed to start</p>
          <div className="flex justify-center gap-4">
            <button
              className="w-32 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl"
              onClick={() => signIn(appConfig.signInRedirectUri)}
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <FeatureCard
            title="Individual Users"
            description="Smart workspace management and collaboration features to boost your productivity"
          />
          <FeatureCard
            title="Small Business"
            description="Professional workspace management tools for small teams to enhance collaboration"
          />
          <FeatureCard
            title="Enterprise"
            description="Secure and reliable workspace management solutions with customization options"
          />
        </div>

        <div className="text-center mt-12 text-gray-500">
          <p>© {new Date().getFullYear()} Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
