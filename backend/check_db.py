from database import get_model_history
import json

history = get_model_history()
print('数据库中的历史记录:')
for i, model in enumerate(history[:3]):
    print(f'{i+1}. ID: {model["id"]}')
    print(f'   model_url: {model["model_url"]}')
    print(f'   preview_url: {model["preview_url"]}')
    print('---')