import { useEffect, useState } from 'react';

import { fetchCurrentUser } from '../api/authApi';

const useCurrentUser = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then(({ user: currentUser }) => {
        if (!cancelled) {
          setUser(currentUser ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, setUser };
};

export default useCurrentUser;
