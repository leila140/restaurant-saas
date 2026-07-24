export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Connexion
        </h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="email@restaurant.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
