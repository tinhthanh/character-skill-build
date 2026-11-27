"""Ready-made 3D sets (`"set": { "preset": … }`) and the default room."""

# BỐI CẢNH DỰNG SẴN (`"set": { "preset": "reception" }`): đồ đạc của một căn phòng quen thuộc, đặt theo phòng mặc định
# (rộng 1800, sâu 1300). Hộp / tấm / tấm hình người viết khai thêm thì CỘNG vào sau. Nhân vật vẫn tự đặt (gợi ý chỗ đứng
# ghi ở `spots`, in ra khi dựng). Toạ độ chọn để người đứng ở `spots` không đứng lọt vào lòng hộp.
SET_PRESETS = {
    'reception': {
        'boxes': [{'name': 'counter', 'x': -520, 'z': -430, 'width': 440, 'depth': 140, 'height': 190, 'color': '#c9ad8c', 'top': '#e7d7c2', 'side': '#b89a78'},
                  {'name': 'bench', 'x': 330, 'z': -820, 'width': 360, 'depth': 120, 'height': 90, 'color': '#9fc3cf', 'top': '#d8e9ef', 'side': '#86aebb'}],
        'panels': [{'wall': 'back', 'at': -480, 'y': 560, 'width': 360, 'height': 210, 'color': '#2b2f36', 'border': '10px solid #2b2f36'},
                   {'wall': 'back', 'at': 300, 'y': 580, 'width': 260, 'height': 160, 'color': '#e9f3f6', 'border': '10px solid #ffffff'}],
        'cutouts': [{'kind': 'laptop', 'x': -430, 'z': -470, 'y': 190}, {'kind': 'plant', 'x': 780, 'z': 60, 'height': 300}],
        'spots': 'receptionist behind the counter: x -300, z -620 · visitors: x 150…400, z -380',
    },
    'exam': {
        'room': {'gloss': True},                    # gạch bóng: đèn và cửa sổ phản chiếu trên sàn
        'boxes': [{'name': 'table', 'x': 100, 'z': -480, 'width': 200, 'depth': 160, 'height': 170, 'color': '#9fc3cf', 'top': '#eef5f7', 'side': '#86aebb'},
                  {'name': 'cabinet', 'x': -780, 'z': -1050, 'width': 260, 'depth': 120, 'height': 330, 'color': '#e9eef1', 'top': '#ffffff', 'side': '#ccd6dc'}],
        'panels': [{'wall': 'back', 'at': -380, 'y': 560, 'width': 260, 'height': 190, 'color': '#ffffff', 'border': '10px solid #dfe9ec'},
                   {'wall': 'back', 'at': 380, 'y': 600, 'width': 180, 'height': 240, 'color': '#d6ecf3', 'border': '8px solid #ffffff', 'window': True}],
        'cutouts': [{'kind': 'plant', 'x': 760, 'z': 80, 'height': 300}],
        # ĐÈN KHÁM treo trên bàn, sáng cả ban ngày: một vùng sáng tập trung trên bàn, bóng đổ rõ dưới bàn và dưới chân người
        # — phòng khám trắng sáng đều thì phẳng như tờ giấy (Gemini soát ánh sáng đợt 21: 2/10). Đèn ở SAU, lệch PHẢI bàn: bóng
        # bàn đổ chéo sang trái phía trước — thấy được cả ở khung dọc, nơi dải sàn trước bàn rất hẹp (đợt 24).
        'lamps': [{'name': 'exam', 'x': 430, 'y': 640, 'z': -760, 'kind': 'ceiling', 'color': '#fff4e0', 'power': 0.8, 'range': 900, 'on': True}],
        'spots': 'pet on the table: "on": "table", x 200, z -560 · vet: x 40, z -560 · owner: x 360, z -560',
    },
    'pharmacy': {
        'room': {'gloss': True},
        'boxes': [{'name': 'counter', 'x': -260, 'z': -420, 'width': 520, 'depth': 130, 'height': 180, 'color': '#f2f4f7', 'top': '#ffffff', 'side': '#d6dbe2'},
                  {'name': 'shelf', 'x': -700, 'z': -1100, 'width': 1400, 'depth': 120, 'height': 420, 'color': '#c9ad8c', 'top': '#e7d7c2', 'side': '#b89a78'}],
        'panels': [{'wall': 'back', 'at': -120, 'y': 640, 'width': 240, 'height': 90, 'color': '#1f8a70', 'border': '6px solid #ffffff'}],
        # Đợt 44 B: màn hình sang mép trái quầy (x 120 → -230) — ở x 120 nó che 33 % đầu dược sĩ đứng ở chỗ gợi ý (acting_check đo bằng pixel);
        # bên phải là chỗ khách đứng và đế thanh toán. Gộp đợt 44: cao 360 (mặc định to hơn) — góc máy lệch trái lúc vẫy chào vẫn đè màn hình
        # lên mặt dược sĩ ở chỗ gợi ý (x 0); thấp đi thì mép trên dưới cằm.
        'cutouts': [{'kind': 'monitor', 'x': -230, 'z': -460, 'y': 180, 'height': 300}],
        'spots': 'pharmacist behind the counter: x 0, z -620 · customer: x 0…250, z -300',
    },
    # NGOÀI TRỜI: tường sau là bầu trời + đồi xa (vẽ bằng dải màu), hai tường bên cùng màu trời để không thành vách phòng.
    'park': {
        'room': {'width': 2200, 'depth': 1500, 'floor': '#8cc46d', 'floor2': '#84bb66', 'tile': 260,
                 'wall': 'linear-gradient(#a9d8f2 0%, #dff1fa 58%, #a7d48a 58%, #8fc571 100%)', 'sideWall': 'linear-gradient(#b9e0f4 0%, #dff1fa 58%, #a7d48a 58%, #8fc571 100%)',
                 'skyline': 0.58},                   # trời vẽ trên tường tới 58 % bề cao: tối theo giờ như bầu trời, không như tường
        # Ghế đá cao 100 — đúng mặt ghế của rig (~86 đơn vị khung ≈ 100 ở cỡ người mặc định): cao 85 thì người ngồi lơ lửng trên
        # ghế 3,5 % chiều cao (đo bằng tools/acting_check.py, đợt 29).
        'boxes': [{'name': 'bench', 'x': 220, 'z': -880, 'width': 340, 'depth': 110, 'height': 100, 'color': '#a47551', 'top': '#c08f66', 'side': '#8c6243'}],
        'cutouts': [{'kind': 'tree', 'x': -720, 'z': -1100}, {'kind': 'tree', 'x': 780, 'z': -1000, 'color': '#5f9a68'}, {'kind': 'lamp', 'x': -260, 'z': -1150},
                    {'kind': 'plant', 'x': 900, 'z': 60, 'height': 560, 'color': '#a47551'}],
        'spots': 'walk the dog along x -600…600, z -500 · on the bench: "on": "bench", x 380, "seated": true (sits in front of it) · a pet the person on the bench strokes or picks up: the same z as the bench (-880), it walks over',
    },
    'street': {
        'room': {'width': 2200, 'depth': 1300, 'floor': '#cfcfc8', 'floor2': '#c2c2bb', 'tile': 150,
                 'wall': 'linear-gradient(#e9d8c2 0%, #e9d8c2 82%, #b9a58c 82%)', 'sideWall': 'linear-gradient(#bfe0f2, #e3f2f9)'},
        'panels': [{'wall': 'back', 'at': -700, 'y': 460, 'width': 420, 'height': 300, 'color': '#a9d6ec', 'border': '14px solid #6b4f3a'},
                   {'wall': 'back', 'at': -200, 'y': 400, 'width': 170, 'height': 300, 'color': '#6b4f3a', 'border': '8px solid #4a3627'},
                   {'wall': 'back', 'at': 120, 'y': 460, 'width': 420, 'height': 300, 'color': '#a9d6ec', 'border': '14px solid #6b4f3a'},
                   {'wall': 'back', 'at': -720, 'y': 610, 'width': 1300, 'height': 90, 'color': '#2f9e8f', 'border': '6px solid #ffffff'}],
        'cutouts': [{'kind': 'lamp', 'x': -900, 'z': -700}, {'kind': 'tree', 'x': 820, 'z': -750}, {'kind': 'lamp', 'x': 500, 'z': -700}],
        'spots': 'pedestrians along x -700…700, z -400 · a shop door at x -115 on the back wall',
    },
    'living-room': {
        'room': {'floor': '#d9c4a8', 'floor2': '#cdb596', 'wall': '#f3ead9', 'sideWall': '#eadfcb'},
        'boxes': [{'name': 'sofa', 'x': -560, 'z': -860, 'width': 520, 'depth': 180, 'height': 110, 'color': '#7a9e9f', 'top': '#8fb3b4', 'side': '#68898a'},
                  {'name': 'coffee-table', 'x': 80, 'z': -700, 'width': 220, 'depth': 120, 'height': 80, 'color': '#a47551', 'top': '#b88a63', 'side': '#8c6243'}],
        'panels': [{'wall': 'back', 'at': 120, 'y': 560, 'width': 380, 'height': 260, 'color': '#bfe0f0', 'border': '14px solid #ffffff', 'window': True}],
        'cutouts': [{'kind': 'plant', 'x': 700, 'z': -300, 'height': 640}, {'kind': 'floorlamp', 'name': 'lamp', 'x': -180, 'z': -840, 'height': 470},
                    {'kind': 'tv', 'x': 540, 'z': -900}],
        # KHUNG DỌC: TV xích lại gần sofa — để x 540 thì góc toàn dọc không lấy trọn được cả sofa lẫn TV (đợt 27: sofa lẹm mép);
        # sofa ngắn lại và dịch vào giữa — chỉ dời TV thì góc toàn vẫn lẹm đầu trái sofa (Gemini, đợt 28).
        'vertical': {'cutouts': {'tv': {'x': 330}}, 'boxes': {'sofa': {'x': -470, 'width': 440}}},
        'spots': 'owner on the sofa: "on": "sofa", x -300, z -820, "seated": true · pet on the floor: x 0, z -500 (a pet the owner on the sofa strokes or picks up: z -820, it walks over) · a standing lamp "lamp" by the sofa (lit in the evening / at night; "lamp": "on" / "off" on a turn)',
    },
}
ROOM_DEFAULTS = {'width': 1800, 'depth': 1300, 'height': 700, 'front': 200, 'floor': '#b7ccd3', 'floor2': '#a9c1c9', 'tile': 200,
                 'wall': 'linear-gradient(#d9e8ec, #c3d8de)', 'sideWall': 'linear-gradient(#cfdfe4, #b8ced5)'}
