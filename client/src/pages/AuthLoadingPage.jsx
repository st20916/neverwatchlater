import { useEffect } from 'react';

import { getGoogleLoginUrl } from '../api/authApi';

import PlaylistSetupPage from './PlaylistSetupPage.jsx';

const AuthLoadingPage = () => {
  useEffect(() => {
    window.location.assign(getGoogleLoginUrl());
  }, []);

  return <PlaylistSetupPage initialState="linking" showPreview={false} />;
};

export default AuthLoadingPage;
