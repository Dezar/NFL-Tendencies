from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        try:
            import nfl_data_py as nfl
            import warnings
            warnings.filterwarnings('ignore')

            # Pull 2026 seasonal rosters
            rosters_raw = nfl.import_seasonal_rosters([2026])

            SKILL_POS = ['QB', 'RB', 'WR', 'TE']

            roster = rosters_raw[
                rosters_raw['position'].isin(SKILL_POS) &
                rosters_raw['status'].isin(['ACT', 'INA'])
            ].copy()

            roster = roster[[
                'season', 'team', 'position', 'player_name',
                'years_exp', 'age', 'entry_year', 'draft_number', 'status'
            ]]

            # Pull latest depth charts
            dc_raw = nfl.import_depth_charts([2026])
            latest_dt = dc_raw['dt'].max()
            dc = dc_raw[dc_raw['dt'] == latest_dt].copy()

            dc_skill = dc[dc['pos_abb'].isin(SKILL_POS)][
                ['team', 'gsis_id', 'player_name', 'pos_abb', 'pos_rank']
            ].copy()

            # Best depth rank per player per team
            dc_best = dc_skill.groupby(['team', 'player_name', 'pos_abb'])['pos_rank'].min().reset_index()
            dc_best.columns = ['team', 'player_name', 'position', 'depth_rank']

            # Merge
            merged = roster.merge(
                dc_best[['team', 'player_name', 'depth_rank']],
                on=['team', 'player_name'],
                how='left'
            )
            merged['depth_rank'] = merged['depth_rank'].fillna(99).astype(int)

            # Only depth rank <= 3 for fantasy relevance
            merged = merged[merged['depth_rank'] <= 3]

            # Convert to dict, handle NaN
            import math
            def clean(v):
                if v is None: return None
                try:
                    if math.isnan(float(v)): return None
                except: pass
                return v

            players = []
            for _, row in merged.iterrows():
                players.append({
                    'team': row['team'],
                    'position': row['position'],
                    'player_name': row['player_name'],
                    'depth_rank': int(row['depth_rank']),
                    'years_exp': clean(row.get('years_exp')),
                    'age': clean(row.get('age')),
                    'draft_number': clean(row.get('draft_number')),
                    'status': row.get('status', 'ACT'),
                    'season': 2026,
                })

            result = {
                'success': True,
                'lastUpdated': str(latest_dt)[:10],
                'playerCount': len(players),
                'players': players
            }

        except Exception as e:
            result = {
                'success': False,
                'error': str(e),
                'players': []
            }

        body = json.dumps(result)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'max-age=3600')
        self.end_headers()
        self.wfile.write(body.encode())
