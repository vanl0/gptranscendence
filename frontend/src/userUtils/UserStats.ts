export type UserStats = {
	total_games: number;
	wins: number;
	losses: number;
  };
  
  export type UserData = {
	username: string;
	display_name: string;
	avatar_url: string;
	bio: string;
	created_at: string;
	friends: number[];
	stats: UserStats;
  };

  const token = localStorage.getItem("auth_token");

  export async function getUserDataFromName(username :string){
	//
  }