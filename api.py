import os
import urllib.request
from bs4 import BeautifulSoup
from flask import Flask, render_template

ROOT_DIR = os.path.dirname((os.path.abspath(__file__)))
app = Flask(
    __name__,
    template_folder=os.path.join(ROOT_DIR, 'templates'),
    static_folder=os.path.join(ROOT_DIR, 'static')
)


def scrape_faculty(faculty_id):
    url = f'https://chennai.vit.ac.in/member/{faculty_id}/'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=10).read()
        soup = BeautifulSoup(html, 'html.parser')

        data = {
            'faculty_id': faculty_id,
            'name': '',
            'photo': '',
            'designation': '',
            'emp_id': '',
            'school': ''
        }

        h3 = soup.find('h3', class_='item-title')
        if h3:
            data['name'] = h3.text.strip()

        img = soup.find('img', class_='wp-post-image')
        if not img:
            img = soup.select_one('.extp-image img') or soup.find('img', alt=data['name'])
        if img and 'src' in img.attrs:
            data['photo'] = img['src']

        content_pad = soup.find('div', class_='content-pad')
        if content_pad:
            lines = [line.strip() for line in content_pad.text.strip().split('\n') if line.strip()]
            if len(lines) > 1:
                data['designation'] = lines[1]
            if len(lines) > 2:
                data['school'] = lines[-1].split('-')[0]

        td_emp = soup.find('td', string=lambda t: t and 'Employee ID' in t)
        if td_emp:
            sibling = td_emp.find_next_sibling('td')
            if sibling:
                data['emp_id'] = sibling.text.strip()

        if not data['designation']:
            for th in soup.find_all('th'):
                th_text = th.text.strip()
                td = th.find_next_sibling('td')
                if td:
                    if 'Designation' in th_text:
                        data['designation'] = td.text.strip()
                    elif 'School' in th_text or 'Centre' in th_text:
                        data['school'] = td.text.strip()

        return data
    except Exception as e:
        print(f"Scraping error: {e}")
        return None


def handler(event, context):
    """Native Netlify Python Function handler."""
    from urllib.parse import urlencode, parse_qs, urlparse

    path = event.get('path', '/')
    http_method = event.get('httpMethod', 'GET')

    # Use Flask's test client to process the request
    with app.test_client() as client:
        # Reconstruct query string
        query_string = event.get('queryStringParameters') or {}
        if query_string:
            path = path + '?' + urlencode(query_string)

        # Get headers and body
        headers = event.get('headers') or {}
        body = event.get('body', '')

        resp = client.open(
            path,
            method=http_method,
            headers=headers,
            data=body
        )

        # Convert Flask response to Netlify format
        response_headers = dict(resp.headers)
        return {
            'statusCode': resp.status_code,
            'headers': response_headers,
            'body': resp.get_data(as_text=True)
        }


@app.route('/member/<faculty_id>/')
@app.route('/member/<faculty_id>')
def member_page(faculty_id):
    faculty_data = scrape_faculty(faculty_id)
    if not faculty_data or not faculty_data['name']:
        return "Faculty not found", 404
    return render_template('index.html', faculty=faculty_data)


if __name__ == '__main__':
    app.run()
